import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Client } from 'pg'

// Explicit opt-in. Every migration validation and fixture write is rolled back.
test(
  'scoring, atomic transition alerts, ownership boundaries and member removal',
  { skip: process.env.RUN_LEAD_DB_TESTS !== 'true' },
  async () => {
    const db = new Client({ connectionString: process.env.DATABASE_URL })
    await db.connect()
    try {
      await db.query('BEGIN')
      await db.query("SET LOCAL lock_timeout='5s'")
      const installed = await db.query(
        "SELECT to_regprocedure('public.calculate_lead_score(text,text,text,text,text,text,boolean)') AS installed",
      )
      if (!installed.rows[0].installed)
        await db.query(
          readFileSync(
            'prisma/migrations/20261030120000_lead_workflow/migration.sql',
            'utf8',
          ),
        )
      const score = async (args: (string | boolean | null)[]) =>
        (
          await db.query(
            'SELECT * FROM public.calculate_lead_score($1,$2,$3,$4,$5,$6,$7)',
            args,
          )
        ).rows[0]
      assert.equal(
        (await score([null, null, null, null, null, null, null])).priority,
        'cold',
      )
      assert.equal(
        (
          await score([
            'immediate',
            null,
            null,
            'Course',
            'test@example.invalid',
            null,
            true,
          ])
        ).priority,
        'hot',
      )
      assert.equal(
        (
          await score([
            'within_1_month',
            'fees',
            null,
            null,
            'test@example.invalid',
            null,
            true,
          ])
        ).priority,
        'warm',
      )
      assert.equal(
        (
          await score([
            'immediate',
            'application',
            null,
            'Course',
            'test@example.invalid',
            null,
            null,
          ])
        ).priority,
        'warm',
      )
      for (const stage of ['enrolled', 'lost'])
        assert.equal(
          (
            await score([
              'immediate',
              'application',
              stage,
              'Course',
              'test@example.invalid',
              null,
              true,
            ])
          ).priority,
          'cold',
        )
      assert.equal(
        (
          await score([
            'immediate',
            'application',
            null,
            'Course',
            'test@example.invalid',
            null,
            false,
          ])
        ).priority,
        'cold',
      )
      assert.match(
        (
          await score([
            'exploring',
            'counselling',
            'counselling_requested',
            'Course',
            'test@example.invalid',
            null,
            true,
          ])
        ).reason,
        /60 points/,
      ) // intent and stage not counted twice
      const org = `workflow-test-${randomUUID()}`,
        otherOrg = `workflow-test-${randomUUID()}`
      const owner = randomUUID(),
        admin = randomUUID(),
        outsider = randomUUID(),
        lead = randomUUID()
      await db.query(
        'INSERT INTO public.organizations(id,name) VALUES($1,$1),($2,$2)',
        [org, otherOrg],
      )
      for (const id of [owner, admin, outsider])
        await db.query(
          'INSERT INTO public.users(id,email,updated_at) VALUES($1,$2,now())',
          [id, `${id}@example.invalid`],
        )
      for (const [organization, user, role] of [
        [org, owner, 'counsellor'],
        [org, admin, 'admin'],
        [otherOrg, outsider, 'admin'],
      ])
        await db.query(
          'INSERT INTO public.organization_members(id,organization_id,user_id,role) VALUES($1,$2,$3,$4)',
          [randomUUID(), organization, user, role],
        )
      await db.query(
        'INSERT INTO public.leads(id,organization_id,name,email,assigned_counsellor_id,updated_at) VALUES($1,$2,$3,$4,$5,now())',
        [lead, org, 'Workflow fixture', 'fixture@example.invalid', owner],
      )
      const changed = await db.query(
        "UPDATE public.leads SET joining_timeline='immediate',course_interest='Course',consent_to_contact=true WHERE id=$1 RETURNING lead_priority,priority_reason",
        [lead],
      )
      assert.equal(changed.rows[0].lead_priority, 'hot')
      assert.match(changed.rows[0].priority_reason, /70 points/)
      let notifications = await db.query(
        'SELECT * FROM public.notifications WHERE organization_id=$1',
        [org],
      )
      assert.equal(notifications.rowCount, 1)
      assert.equal(notifications.rows[0].user_id, owner)
      await db.query(
        "UPDATE public.leads SET joining_timeline='immediate', name='Changed name' WHERE id=$1",
        [lead],
      )
      assert.equal(
        (
          await db.query(
            'SELECT id FROM public.notifications WHERE organization_id=$1',
            [org],
          )
        ).rowCount,
        1,
      )
      await db.query(
        "UPDATE public.leads SET pipeline_stage='qualified' WHERE id=$1",
        [lead],
      )
      notifications = await db.query(
        'SELECT * FROM public.notifications WHERE organization_id=$1',
        [org],
      )
      assert.equal(notifications.rowCount, 2)
      await db.query('SAVEPOINT invalid_owner')
      await assert.rejects(
        db.query(
          'UPDATE public.leads SET assigned_counsellor_id=$1 WHERE id=$2',
          [outsider, lead],
        ),
        /Counsellor must be a member|Choose an active Owner, Admin or Counsellor/,
      )
      await db.query('ROLLBACK TO SAVEPOINT invalid_owner')
      const followUp = randomUUID()
      await db.query(
        "INSERT INTO public.lead_follow_ups(id,lead_id,counsellor_id,status,updated_at) VALUES($1,$2,$3,'pending',now())",
        [followUp, lead, owner],
      )
      // Run the actual scheduler SQL on this transaction. No notices or fixture
      // data survive the rollback, and no email transport is invoked.
      const { enqueueFollowUpAlerts } = await import('../../lib/leads/alerts')
      const execute = {
        $executeRaw: async (query: { text: string; values: unknown[] }) =>
          (await db.query(query.text, query.values)).rowCount,
      }
      const reminderDb = execute as unknown as Parameters<
        typeof enqueueFollowUpAlerts
      >[1]
      {
        const due = randomUUID(),
          overdue = randomUUID()
        const clock = new Date('2036-10-30T18:20:00.000Z')
        for (const [id, date, status, deleted] of [
          [due, '2036-10-30T18:25:00Z', 'pending', false],
          [overdue, '2036-10-30T18:00:00Z', 'pending', false],
          [randomUUID(), '2036-10-30T18:30:00Z', 'pending', false],
          [randomUUID(), '2036-10-30T18:00:00Z', 'complete', false],
          [randomUUID(), '2036-10-30T18:00:00Z', 'cancelled', false],
          [randomUUID(), '2036-10-30T18:00:00Z', 'pending', true],
        ])
          await db.query(
            'INSERT INTO public.lead_follow_ups(id,lead_id,status,scheduled_for,deleted_at,updated_at) VALUES($1,$2,$3,$4,$5,now())',
            [id, lead, status, date, deleted ? clock : null],
          )
        const count = async () =>
          Number(
            (
              await db.query(
                "SELECT count(*) FROM public.notifications WHERE organization_id=$1 AND type IN ('follow_up_due','follow_up_overdue')",
                [org],
              )
            ).rows[0].count,
          )
        await enqueueFollowUpAlerts(clock, reminderDb)
        assert.equal(await count(), 2)
        await enqueueFollowUpAlerts(clock, reminderDb)
        assert.equal(await count(), 2)
        await db.query(
          'UPDATE public.notifications SET dismissed_at=now() WHERE organization_id=$1',
          [org],
        )
        await enqueueFollowUpAlerts(clock, reminderDb)
        assert.equal(await count(), 2)
        await db.query(
          "UPDATE public.lead_follow_ups SET scheduled_for='2036-10-30T18:26:00Z' WHERE id=$1",
          [due],
        )
        await enqueueFollowUpAlerts(clock, reminderDb)
        assert.equal(await count(), 3)
        await db.query(
          'UPDATE public.lead_follow_ups SET counsellor_id=$1 WHERE id=$2',
          [admin, due],
        )
        await enqueueFollowUpAlerts(clock, reminderDb)
        assert.equal(await count(), 4)
        await enqueueFollowUpAlerts(
          new Date('2036-10-30T18:27:00Z'),
          reminderDb,
        )
        assert.equal(await count(), 5)
        const targetOwner = await db.query(
          "SELECT user_id FROM public.notifications WHERE organization_id=$1 AND type='follow_up_overdue' AND metadata->>'followUpId'=$2",
          [org, due],
        )
        assert.equal(targetOwner.rows[0].user_id, admin)
        await db.query(
          "UPDATE public.lead_follow_ups SET status='complete' WHERE id=$1",
          [due],
        )
        await enqueueFollowUpAlerts(
          new Date('2036-10-30T18:28:00Z'),
          reminderDb,
        )
        assert.equal(await count(), 5)
      }
      await db.query(
        'DELETE FROM public.organization_members WHERE organization_id=$1 AND user_id=$2',
        [org, owner],
      )
      assert.equal(
        (
          await db.query(
            'SELECT assigned_counsellor_id FROM public.leads WHERE id=$1',
            [lead],
          )
        ).rows[0].assigned_counsellor_id,
        null,
      )
      assert.equal(
        (
          await db.query(
            'SELECT counsellor_id FROM public.lead_follow_ups WHERE id=$1',
            [followUp],
          )
        ).rows[0].counsellor_id,
        null,
      )
      await db.query(
        "UPDATE public.leads SET lead_priority='cold' WHERE id=$1",
        [lead],
      )
      assert.equal(
        (
          await db.query('SELECT lead_priority FROM public.leads WHERE id=$1', [
            lead,
          ])
        ).rows[0].lead_priority,
        'hot',
      )
      await db.query(
        "UPDATE public.leads SET pipeline_stage='lost',lost_reason='Fixture lost reason' WHERE id=$1",
        [lead],
      )
      await db.query(
        "UPDATE public.leads SET pipeline_stage='qualified' WHERE id=$1",
        [lead],
      )
      const adminNotices = await db.query(
        "SELECT type FROM public.notifications WHERE organization_id=$1 AND user_id=$2 AND type IN ('lead_hot','lead_qualified')",
        [org, admin],
      )
      assert.equal(adminNotices.rowCount, 2)
      assert.equal(
        (
          await db.query(
            'SELECT id FROM public.notifications WHERE organization_id=$1',
            [otherOrg],
          )
        ).rowCount,
        0,
      )
    } finally {
      await db.query('ROLLBACK')
      await db.end()
    }
  },
)
