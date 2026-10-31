import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareFollowUps,
  dayKey,
  fromWorkspaceInput,
  inQueue,
  toWorkspaceInput,
  type FollowUpItem,
} from '../../lib/leads/follow-ups'

const now = new Date('2026-10-30T18:20:00.000Z') // 23:50 IST
function task(overrides: Partial<FollowUpItem> = {}): FollowUpItem {
  return {
    id: '1',
    leadId: 'lead',
    leadName: 'Test',
    leadPriority: 'warm',
    counsellorId: null,
    followUpType: 'callback',
    status: 'pending',
    scheduledFor: null,
    completedAt: null,
    outcome: null,
    notes: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}
test('queue boundaries consistently use IST, including midnight', () => {
  const overdue = task({ scheduledFor: '2026-10-30T18:00:00Z' })
  const today = task({ scheduledFor: '2026-10-30T18:29:59Z' })
  const tomorrow = task({ scheduledFor: '2026-10-30T18:30:00Z' })
  assert.equal(inQueue(overdue, 'overdue', now), true)
  assert.equal(inQueue(overdue, 'today', now), true)
  assert.equal(inQueue(today, 'today', now), true)
  assert.equal(inQueue(today, 'overdue', now), false)
  assert.equal(inQueue(tomorrow, 'today', now), false)
  assert.equal(inQueue(tomorrow, 'upcoming', now), true)
  assert.equal(dayKey(new Date('2026-10-30T18:30:00Z')), '2026-10-31')
})
test('completed and cancelled tasks do not remain in active queues', () => {
  for (const status of ['complete', 'cancelled'] as const) {
    const item = task({ status, scheduledFor: '2020-01-01T00:00:00Z' })
    for (const queue of [
      'all',
      'overdue',
      'today',
      'upcoming',
      'unassigned',
      'unscheduled',
    ] as const)
      assert.equal(inQueue(item, queue, now), false)
    assert.equal(inQueue(item, status, now), true)
  }
  assert.equal(inQueue(task(), 'unscheduled', now), true)
  assert.equal(inQueue(task(), 'unassigned', now), true)
})
test('urgency precedes FIFO creation order and IDs break timestamp ties', () => {
  const futureOld = task({
    id: 'future',
    scheduledFor: '2026-11-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  })
  const overdueNew = task({
    id: 'new',
    scheduledFor: '2026-10-29T00:00:00Z',
    createdAt: '2026-10-10T00:00:00Z',
  })
  const overdueOld = task({
    id: 'old',
    scheduledFor: '2026-10-30T00:00:00Z',
    createdAt: '2026-10-01T00:00:00Z',
  })
  assert.deepEqual(
    [futureOld, overdueNew, overdueOld]
      .sort((a, b) => compareFollowUps(a, b, now))
      .map((item) => item.id),
    ['old', 'new', 'future'],
  )
  assert.ok(compareFollowUps(task({ id: 'a' }), task({ id: 'b' }), now) < 0)
})
test('schedule edits round-trip in the workspace zone regardless of browser zone', () => {
  assert.equal(toWorkspaceInput('2026-10-30T18:30:00.000Z'), '2026-10-31T00:00')
  assert.equal(
    fromWorkspaceInput('2026-10-31T00:00'),
    '2026-10-30T18:30:00.000Z',
  )
  assert.equal(fromWorkspaceInput(''), null)
})
