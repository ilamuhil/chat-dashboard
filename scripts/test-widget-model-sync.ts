/** Read-only check across generated Prisma, SQLAlchemy, and the live test DB.
 * pnpm exec tsx scripts/test-widget-model-sync.ts
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { Prisma } from '../generated/prisma/client'

const bot = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Bots')
assert.ok(bot)
const schema = readFileSync('prisma/schema.prisma', 'utf8').match(
  /model Bots \{([\s\S]*?)\n\}/,
)?.[1]
assert.ok(schema)
// Prisma's runtime DMMF keeps names/types but omits nullability; read that from its source schema.
const columns = bot.fields
  .filter((field) => field.kind !== 'object')
  .map((field) => {
    const type = schema.match(
      new RegExp('^\\s+' + field.name + '\\s+(\\S+)', 'm'),
    )?.[1]
    assert.ok(type, field.name)
    return { name: field.dbName ?? field.name, nullable: type.endsWith('?') }
  })
const python = `
import json, sys
from sqlalchemy import inspect, select
from app.db.session import dashboard_db_engine, DashboardDbSessionLocal
from app.models.dashboard_db_models import Bots
prisma = {column['name']: column for column in json.load(sys.stdin)}
live = {column['name']: column for column in inspect(dashboard_db_engine).get_columns('bots', schema='public')}
model = {column.name: column for column in Bots.__table__.columns}
assert set(prisma) == set(live) == set(model), {'prisma': sorted(prisma), 'sqlalchemy': sorted(model), 'database': sorted(live)}
for name in model:
    assert prisma[name]['nullable'] == model[name].nullable == live[name]['nullable'], name
for name in ['widget_visibility_mode', 'widget_visibility_routes', 'avatar_url', 'support_email', 'support_team_name', 'human_reply_minutes', 'support_hours', 'help_center_url']:
    assert str(model[name].type) == str(live[name]['type']), name
with DashboardDbSessionLocal() as session:
    session.execute(select(Bots).limit(1)).first()
print(f'PASS: all {len(model)} bot columns agree across Prisma, SQLAlchemy and the live database; support/visibility types match and ORM SELECT succeeds.')
`
const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    process.env.WIDGET_TEST_API_CONTAINER || 'chat_api-api-1',
    'python',
    '-c',
    python,
  ],
  {
    input: JSON.stringify(columns),
    encoding: 'utf8',
  },
)
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
assert.equal(result.status, 0, 'Bot model/schema synchronization check failed')
