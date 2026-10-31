import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Client } from 'pg'

test(
  'migration, audit actors, review confirmation, consent withdrawal, loss reasons and next actions',
  { skip: process.env.RUN_LEAD_DB_TESTS !== 'true' },
  async () => {
    const db = new Client({ connectionString: process.env.DATABASE_URL })
    await db.connect()
    try {
      await db.query('BEGIN')
      await db.query("SET LOCAL lock_timeout='5s'")
      if (
        !(
          await db.query(
            "SELECT to_regclass('public.lead_activities') AS installed",
          )
        ).rows[0].installed
      )
        await db.query(
          readFileSync(
            'prisma/migrations/20261030150000_admissions_operations/migration.sql',
            'utf8',
          ),
        )
      const org = `operations-test-${randomUUID()}`,
        other = `operations-test-${randomUUID()}`,
        actor = randomUUID(),
        outsider = randomUUID(),
        lead = randomUUID(),
        task = randomUUID()
      await db.query(
        'INSERT INTO public.organizations(id,name) VALUES($1,$1),($2,$2)',
        [org, other],
      )
      for (const id of [actor, outsider])
        await db.query(
          'INSERT INTO public.users(id,email,full_name,updated_at) VALUES($1,$2,$3,now())',
          [id, `${id}@example.invalid`, 'Audit counsellor'],
        )
      for (const [organization, user] of [
        [org, actor],
        [other, outsider],
      ])
        await db.query(
          "INSERT INTO public.organization_members(id,organization_id,user_id,role) VALUES($1,$2,$3,'counsellor')",
          [randomUUID(), organization, user],
        )
      await db.query("SELECT set_config('app.actor_id',$1,true)", [actor])
      await db.query(
        "INSERT INTO public.leads(id,organization_id,name,phone,consent_to_contact,pipeline_stage,updated_at) VALUES($1,$2,'Operations fixture','9876543210',true,'new_enquiry',now())",
        [lead, org],
      )
      const action = async () =>
        (
          await db.query(
            'SELECT recommended_next_action FROM public.leads WHERE id=$1',
            [lead],
          )
        ).rows[0].recommended_next_action
      assert.equal(await action(), 'assign_lead')
      await db.query(
        "INSERT INTO public.lead_follow_ups(id,lead_id,source_request_id,follow_up_type,status,notes,updated_at) VALUES($1,$2,$3,'callback','requested','Tomorrow afternoon',now())",
        [task, lead, randomUUID()],
      )
      assert.equal(await action(), 'assign_callback')
      const invalid = async (
        sql: string,
        params: unknown[],
        message: RegExp,
      ) => {
        await db.query('SAVEPOINT invalid_operation')
        await assert.rejects(db.query(sql, params), message)
        await db.query('ROLLBACK TO SAVEPOINT invalid_operation')
      }
      await invalid(
        "UPDATE public.lead_follow_ups SET status='pending' WHERE id=$1",
        [task],
        /counsellor/,
      )
      await invalid(
        "UPDATE public.lead_follow_ups SET status='pending',counsellor_id=$2,scheduled_for=now()+interval '1 day' WHERE id=$1",
        [task, outsider],
        /counsellor/,
      )
      await invalid(
        "UPDATE public.lead_follow_ups SET status='pending',counsellor_id=$2,scheduled_for=now()-interval '1 day' WHERE id=$1",
        [task, actor],
        /future schedule/,
      )
      await db.query(
        'UPDATE public.lead_follow_ups SET counsellor_id=$2 WHERE id=$1',
        [task, actor],
      )
      assert.equal(await action(), 'confirm_callback')
      await db.query(
        "UPDATE public.lead_follow_ups SET status='pending',scheduled_for=now()+interval '1 day' WHERE id=$1",
        [task],
      )
      assert.equal(await action(), 'follow_up_callback')
      const events = await db.query(
        'SELECT kind,actor_id,actor_label,details FROM public.lead_activities WHERE lead_id=$1 ORDER BY created_at,id',
        [lead],
      )
      assert.ok(events.rows.some((row) => row.kind === 'request_confirmed'))
      assert.ok(
        events.rows.every(
          (row) =>
            row.actor_id === actor && row.actor_label === 'Audit counsellor',
        ),
      )
      const priorCount = events.rowCount
      await db.query(
        'UPDATE public.leads SET recommended_next_action=$2 WHERE id=$1',
        [lead, 'other'],
      )
      assert.equal(await action(), 'follow_up_callback')
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int AS count FROM public.lead_activities WHERE lead_id=$1',
            [lead],
          )
        ).rows[0].count,
        priorCount,
      )
      await db.query(
        'UPDATE public.leads SET consent_to_contact=false WHERE id=$1',
        [lead],
      )
      assert.equal(
        (
          await db.query(
            'SELECT status FROM public.lead_follow_ups WHERE id=$1',
            [task],
          )
        ).rows[0].status,
        'cancelled',
      )
      assert.equal(await action(), 'respect_contact_consent')
      await invalid(
        "UPDATE public.leads SET pipeline_stage='lost' WHERE id=$1",
        [lead],
        /lost reason/,
      )
      await db.query(
        "UPDATE public.leads SET pipeline_stage='lost',lost_reason='Fees not suitable' WHERE id=$1",
        [lead],
      )
      assert.equal(await action(), 'no_action_closed')
      await db.query(
        "UPDATE public.leads SET pipeline_stage='new_enquiry' WHERE id=$1",
        [lead],
      )
      assert.equal(
        (
          await db.query('SELECT lost_reason FROM public.leads WHERE id=$1', [
            lead,
          ])
        ).rows[0].lost_reason,
        null,
      )
      const history = await db.query(
        "SELECT details FROM public.lead_activities WHERE lead_id=$1 AND details->'changes' ? 'lost_reason'",
        [lead],
      )
      assert.ok(
        history.rows.some((row) =>
          JSON.stringify(row.details).includes('Fees not suitable'),
        ),
      )
      await db.query("SELECT set_config('app.actor_id',$1,true)", [outsider])
      await invalid(
        "UPDATE public.leads SET name='Unauthorized audit actor' WHERE id=$1",
        [lead],
        /Actor is not/,
      )
      await db.query(
        "SELECT set_config('app.actor_id','',true),set_config('app.actor_kind','visitor',true)",
      )
      await db.query(
        "UPDATE public.leads SET course_interest='Course' WHERE id=$1",
        [lead],
      )
      assert.ok(
        (
          await db.query(
            "SELECT id FROM public.lead_activities WHERE lead_id=$1 AND actor_label='Visitor via chatbot'",
            [lead],
          )
        ).rowCount,
      )
      await db.query("SELECT set_config('app.actor_id',$1,true)", [actor])
      await db.query(
        'UPDATE public.leads SET consent_to_contact=true WHERE id=$1',
        [lead],
      )
      const callback = randomUUID()
      await db.query(
        "INSERT INTO public.lead_follow_ups(id,lead_id,source_request_id,follow_up_type,status,updated_at) VALUES($1,$2,$3,'callback','requested',now())",
        [callback, lead, randomUUID()],
      )
      await db.query('UPDATE public.leads SET phone=null WHERE id=$1', [lead])
      assert.equal(
        (
          await db.query(
            'SELECT status FROM public.lead_follow_ups WHERE id=$1',
            [callback],
          )
        ).rows[0].status,
        'cancelled',
      )
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int AS count FROM public.lead_activities WHERE organization_id=$1',
            [other],
          )
        ).rows[0].count,
        0,
      )
    } finally {
      await db.query('ROLLBACK')
      await db.end()
    }
  },
)
