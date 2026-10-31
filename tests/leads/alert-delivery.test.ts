import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

// No database/network access: exercise delivery state transitions with a fake
// provider and controlled repository responses. SQL receipt behavior is covered
// by database.test.ts against a real rolled-back transaction.
test('email retries reuse the same key, recover claims, skip stale work and stop before provider expiry', async () => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test'
  const { deliverLeadAlertEmails, renderAlertEmail } =
    await import('../../lib/leads/alerts')
  const now = new Date('2026-10-30T06:00:00Z')
  const state = {
    id: 'notice',
    organization_id: 'org',
    user_id: 'owner',
    title: 'Hot lead',
    body: '<script>bad</script>',
    type: 'lead_hot',
    metadata: { leadId: 'lead' },
    channels: { email: 'pending' } as Record<string, unknown>,
    created_at: now,
  }
  let leadOwner = 'owner'
  const saved: string[] = []
  const tx = {
    $queryRaw: async () =>
      state.channels.email === 'sent' ||
      state.channels.email === 'skipped' ||
      state.channels.email === 'failed'
        ? []
        : [structuredClone(state)],
    notifications: {
      update: async ({
        data,
      }: {
        data: { channels: Record<string, unknown> }
      }) => {
        state.channels = data.channels
        saved.push(String(data.channels.email))
        return state
      },
    },
  }
  const fakeDb = {
    $transaction: async (fn: (client: unknown) => unknown) => fn(tx),
    notifications: tx.notifications,
    organizationMembers: {
      findFirst: async () => ({
        id: 'membership',
        role: 'editor',
        user: { email: 'counsellor@example.invalid' },
      }),
    },
    leads: {
      findFirst: async () => ({
        assignedCounsellorId: leadOwner,
        leadPriority: 'hot',
        pipelineStage: 'new_enquiry',
      }),
    },
  } as unknown as NonNullable<
    Parameters<typeof deliverLeadAlertEmails>[0]
  >['db']
  const errors = mock.method(console, 'error', () => {})
  try {
    const rendered = renderAlertEmail(state, 'counsellor@example.invalid')
    assert.ok(rendered.html.includes('&lt;script&gt;'))
    assert.ok(!rendered.html.includes('<script>'))
    assert.ok(rendered.text.includes('/dashboard/users/leads/lead'))
    const keys: string[] = []
    const first = await deliverLeadAlertEmails({
      db: fakeDb,
      now,
      limit: 1,
      send: async (email) => {
        keys.push(email.idempotencyKey)
        throw new Error('Temporary outage')
      },
    })
    assert.equal(first.failed, 1)
    assert.equal(state.channels.email, 'pending')
    assert.equal(state.channels.attempts, 1)
    assert.ok(state.channels.retryAfter)
    const recovered = await deliverLeadAlertEmails({
      db: fakeDb,
      now: new Date(now.getTime() + 180_000),
      limit: 1,
      send: async (email) => {
        keys.push(email.idempotencyKey)
        return 'provider-id'
      },
    })
    assert.equal(recovered.sent, 1)
    assert.equal(keys[0], keys[1])
    assert.equal(state.channels.email, 'sent')
    const again = await deliverLeadAlertEmails({
      db: fakeDb,
      now,
      limit: 1,
      send: async () => {
        throw new Error('Must not send')
      },
    })
    assert.equal(again.sent, 0)
    state.channels = {
      email: 'sending',
      firstAttemptAt: now.toISOString(),
      claimUntil: null,
    }
    const expired = await deliverLeadAlertEmails({
      db: fakeDb,
      now: new Date(now.getTime() + 24 * 3600_000),
      limit: 1,
      send: async () => {
        throw new Error('Must not send after idempotency expiry')
      },
    })
    assert.equal(expired.failed, 1)
    assert.equal(state.channels.email, 'failed')
    state.channels = { email: 'pending' }
    leadOwner = 'different-owner'
    await deliverLeadAlertEmails({
      db: fakeDb,
      now,
      limit: 1,
      send: async () => {
        throw new Error('Must not send to former owner')
      },
    })
    assert.equal(state.channels.email, 'skipped')
    assert.ok(saved.includes('sending'))
  } finally {
    errors.mock.restore()
  }
})
