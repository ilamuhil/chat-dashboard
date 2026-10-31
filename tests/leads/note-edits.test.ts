import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { Client } from 'pg'
import {
  canEditLeadNote,
  noteEditVersion,
} from '../../lib/leads/note-permissions'
import { OrganizationRole } from '../../lib/organization/roles'

test('note editing respects ownership and the canonical organization roles', () => {
  for (const role of [OrganizationRole.Owner, OrganizationRole.Admin]) {
    assert.equal(canEditLeadNote(role, 'staff', 'other'), true)
    assert.equal(canEditLeadNote(role, 'staff', null), true)
  }
  assert.equal(
    canEditLeadNote(OrganizationRole.Counsellor, 'staff', 'staff'),
    true,
  )
  assert.equal(
    canEditLeadNote(OrganizationRole.Counsellor, 'staff', 'other'),
    false,
  )
  assert.equal(
    canEditLeadNote(OrganizationRole.Counsellor, 'staff', null),
    false,
  )
  for (const role of [OrganizationRole.Viewer, 'editor', '', undefined])
    assert.equal(canEditLeadNote(role, 'staff', 'staff'), false)
  assert.equal(noteEditVersion({}), 0)
  assert.equal(noteEditVersion({ editVersion: 2 }), 2)
})

test(
  'live note edits preserve audit history, enforce tenancy and reject concurrent overwrites',
  {
    skip: process.env.RUN_NOTE_HTTP_TESTS !== 'true',
    timeout: 120000,
  },
  async () => {
    const db = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    })
    await db.connect()
    const org = `note-edit-${randomUUID()}`,
      foreignOrg = `note-edit-${randomUUID()}`
    const users = Object.fromEntries(
      ['owner', 'admin', 'counsellor', 'viewer', 'peer'].map((role) => [
        role,
        randomUUID(),
      ]),
    )
    const lead = randomUUID(),
      otherLead = randomUUID(),
      foreignLead = randomUUID()
    const origin = process.env.MVP_DASHBOARD_URL || 'http://localhost:4000'
    const endpoint = (id = lead) => `/api/dashboard/leads/${id}/activity`
    async function request(
      role: string,
      path: string,
      body?: unknown,
      method = 'PATCH',
    ) {
      return fetch(origin + path, {
        signal: AbortSignal.timeout(30000),
        method,
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          Cookie: `auth_token=${jwt.sign({ sub: users[role], type: 'access' }, process.env.AUTH_JWT_SECRET!, { algorithm: 'HS256', issuer: 'chat-dashboard', audience: 'chat-dashboard-web', expiresIn: '5m' })}; current_organization_id=${org}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      })
    }
    async function expect(response: Response, status: number) {
      const data = await response.json()
      assert.equal(response.status, status, JSON.stringify(data))
      return data
    }
    try {
      await db.query(
        'INSERT INTO public.organizations(id,name) VALUES($1,$1),($2,$2)',
        [org, foreignOrg],
      )
      for (const [role, id] of Object.entries(users)) {
        await db.query(
          'INSERT INTO public.users(id,email,full_name,updated_at) VALUES($1,$2,$3,now())',
          [id, `${id}@example.invalid`, `Note test ${role}`],
        )
        await db.query(
          'INSERT INTO public.organization_members(id,organization_id,user_id,role) VALUES($1,$2,$3,$4)',
          [randomUUID(), org, id, role === 'peer' ? 'counsellor' : role],
        )
      }
      for (const [id, organization] of [
        [lead, org],
        [otherLead, org],
        [foreignLead, foreignOrg],
      ])
        await db.query(
          'INSERT INTO public.leads(id,organization_id,name,updated_at) VALUES($1,$2,$3,now())',
          [id, organization, 'Note editing fixture'],
        )
      const id = randomUUID()
      const created = await expect(
        await request(
          'counsellor',
          endpoint(),
          { id, body: 'Original note' },
          'POST',
        ),
        201,
      )
      const edit = { id, body: 'Revised note', expectedVersion: 0 }
      await expect(await request('viewer', endpoint(), edit), 403)
      await expect(await request('peer', endpoint(), edit), 403)
      await expect(await request('owner', endpoint(otherLead), edit), 404)
      await expect(await request('owner', endpoint(foreignLead), edit), 404)
      await expect(
        await request('counsellor', endpoint(), { ...edit, body: '   ' }),
        400,
      )
      const saved = await expect(
        await request('counsellor', endpoint(), edit),
        200,
      )
      assert.equal(saved.activity.body, 'Revised note')
      assert.equal(saved.activity.actorId, users.counsellor)
      assert.equal(saved.activity.createdAt, created.activity.createdAt)
      assert.equal(saved.activity.details.editVersion, 1)
      assert.deepEqual(saved.audit.details.changes.note_body, {
        from: 'Original note',
        to: 'Revised note',
      })
      assert.equal(saved.audit.actorId, users.counsellor)
      const retry = await expect(
        await request('counsellor', endpoint(), edit),
        200,
      )
      assert.equal(retry.audit, null)
      await expect(
        await request('counsellor', endpoint(), {
          ...edit,
          body: 'Stale edit',
        }),
        409,
      )
      await expect(
        await request('owner', endpoint(), {
          ...edit,
          body: 'Owner correction',
          expectedVersion: 1,
        }),
        200,
      )
      await expect(
        await request('admin', endpoint(), {
          ...edit,
          body: 'Admin correction',
          expectedVersion: 2,
        }),
        200,
      )
      await expect(
        await request('owner', endpoint(), { ...edit, id: saved.audit.id }),
        404,
      )
      const responses = await Promise.all([
        request('owner', endpoint(), {
          ...edit,
          body: 'Concurrent A',
          expectedVersion: 3,
        }),
        request('admin', endpoint(), {
          ...edit,
          body: 'Concurrent B',
          expectedVersion: 3,
        }),
      ])
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
      const audits = await db.query(
        "SELECT count(*)::int AS count FROM public.lead_activities WHERE lead_id=$1 AND kind='note_edited'",
        [lead],
      )
      assert.equal(audits.rows[0].count, 4)
      const history = await expect(
        await request('viewer', endpoint(), undefined, 'GET'),
        200,
      )
      assert.equal(
        history.activities.find((item: { id: string }) => item.id === id)
          .details.editVersion,
        4,
      )
    } finally {
      try {
        // Removing the fixture organization first permits its last Owner to be removed by cascade.
        await db.query(
          'DELETE FROM public.organizations WHERE id=ANY($1::text[])',
          [[org, foreignOrg]],
        )
        await db.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])', [
          Object.values(users),
        ])
      } finally {
        await db.end()
      }
    }
  },
)
