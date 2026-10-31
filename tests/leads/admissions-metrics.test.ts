import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseReportingWindow,
  summarizeAdmissions,
  type AnalyticsLead,
} from '../../lib/leads/admissions-metrics'
import { inQueue, type FollowUpItem } from '../../lib/leads/follow-ups'
import { requestConfirmationError } from '../../lib/leads/request-rules'
function lead(id: string, values: Partial<AnalyticsLead> = {}): AnalyticsLead {
  return {
    id,
    capturedAt: '2026-10-01T00:00:00Z',
    pipelineStage: 'new_enquiry',
    courseInterest: ' Course ',
    source: 'Bot',
    ownerId: null,
    ownerName: 'Unassigned',
    requestCount: 0,
    reviewCount: 0,
    lostReason: null,
    visits: [{ stage: 'new_enquiry', at: '2026-10-01T00:00:00Z' }],
    ...values,
  }
}
test('empty cohorts do not invent conversion or drop-off percentages', () => {
  const report = summarizeAdmissions([])
  assert.equal(report.total, 0)
  assert.equal(report.conversion, null)
  assert.ok(report.progression.every((row) => row.dropOff === null))
  assert.deepEqual(report.byCourse, [])
})
test('skipped, repeated and backward stages are not fabricated into a linear funnel', () => {
  const report = summarizeAdmissions([
    lead('enrolled', {
      pipelineStage: 'enrolled',
      visits: [
        { stage: 'new_enquiry', at: '2026-10-01T00:00:00Z' },
        { stage: 'enrolled', at: '2026-10-02T00:00:00Z' },
      ],
    }),
    lead('lost', {
      pipelineStage: 'lost',
      lostReason: 'Fees',
      visits: [
        { stage: 'qualified', at: '2026-10-01T00:00:00Z' },
        { stage: 'qualified', at: '2026-10-02T00:00:00Z' },
        { stage: 'lost', at: '2026-10-03T00:00:00Z' },
      ],
    }),
    lead('open', {
      pipelineStage: 'qualified',
      visits: [{ stage: 'qualified', at: '2026-10-01T00:00:00Z' }],
    }),
    lead('reopened', {
      pipelineStage: 'qualified',
      visits: [
        { stage: 'qualified', at: '2026-10-01T00:00:00Z' },
        { stage: 'application_started', at: '2026-10-02T00:00:00Z' },
        { stage: 'qualified', at: '2026-10-03T00:00:00Z' },
      ],
    }),
  ])
  assert.equal(report.total, 4)
  assert.equal(report.conversion, 0.25)
  const qualified = report.progression.find((row) => row.stage === 'qualified')!
  assert.equal(qualified.reached, 3)
  assert.equal(qualified.progressed, 1)
  assert.equal(qualified.lostBeforeProgress, 1)
  assert.equal(qualified.stillOpen, 1)
  assert.equal(qualified.dropOff, 1 / 3)
  assert.equal(
    report.progression.find((row) => row.stage === 'counselling_requested')
      ?.reached,
    0,
  )
  assert.equal(
    Object.values(report.counts).reduce((sum, count) => sum + count, 0),
    4,
  )
})
test('current owner identity, course normalization, unknown stages and loss reasons keep lead grain', () => {
  const report = summarizeAdmissions([
    lead('1', {
      ownerId: 'owner-a',
      ownerName: 'Same name',
      requestCount: 2,
      reviewCount: 1,
      pipelineStage: 'lost',
      lostReason: ' Fees ',
    }),
    lead('2', {
      ownerId: 'owner-b',
      ownerName: 'Same name',
      courseInterest: 'course',
      pipelineStage: 'enrolled',
    }),
    lead('3', {
      pipelineStage: 'legacy_unknown',
      source: 'Manual',
      courseInterest: null,
    }),
  ])
  assert.equal(report.byCounsellor.length, 3)
  assert.equal(report.byCourse.find((row) => row.id === 'course')?.total, 2)
  assert.equal(report.requests, 2)
  assert.equal(report.requestLeads, 1)
  assert.equal(report.needsReview, 1)
  assert.equal(report.counts.unknown, 1)
  assert.deepEqual(report.lostReasons, [{ label: 'fees', total: 1 }])
  assert.equal(
    report.bySource.reduce((sum, row) => sum + row.total, 0),
    3,
  )
})
test('inclusive reporting dates use IST and reject invalid or overlong windows', () => {
  const window = parseReportingWindow('2026-10-30', '2026-10-30')
  assert.equal(window.startAt.toISOString(), '2026-10-29T18:30:00.000Z')
  assert.equal(window.endAt.toISOString(), '2026-10-30T18:30:00.000Z')
  assert.throws(() => parseReportingWindow('2026-02-30', '2026-03-01'))
  assert.throws(() => parseReportingWindow('2026-10-31', '2026-10-30'))
  assert.throws(() => parseReportingWindow('2024-01-01', '2026-01-01'))
})
test('request confirmation requires affirmative consent, the right contact channel, an owner and a future time', () => {
  const valid = {
    consent: true,
    email: null,
    phone: '9876543210',
    type: 'callback',
    owner: 'member',
    schedule: new Date('2035-01-01T00:00:00Z'),
    now: new Date('2034-01-01T00:00:00Z'),
  }
  assert.equal(requestConfirmationError(valid), null)
  assert.match(
    requestConfirmationError({ ...valid, consent: false })!,
    /consent/,
  )
  assert.match(
    requestConfirmationError({ ...valid, consent: null })!,
    /consent/,
  )
  assert.match(
    requestConfirmationError({
      ...valid,
      phone: null,
      email: 'test@example.invalid',
    })!,
    /phone/,
  )
  assert.match(
    requestConfirmationError({ ...valid, type: 'send_course_details' })!,
    /email/,
  )
  assert.match(
    requestConfirmationError({ ...valid, owner: null })!,
    /counsellor/,
  )
  assert.match(
    requestConfirmationError({ ...valid, schedule: valid.now })!,
    /future/,
  )
})
test('review requests never become due or overdue before confirmation', () => {
  const item = {
    status: 'requested',
    scheduledFor: '2020-01-01T00:00:00Z',
    counsellorId: null,
  } as FollowUpItem
  assert.equal(inQueue(item, 'review', new Date()), true)
  for (const queue of [
    'all',
    'today',
    'upcoming',
    'overdue',
    'unassigned',
    'unscheduled',
  ] as const)
    assert.equal(inQueue(item, queue, new Date()), false)
})
