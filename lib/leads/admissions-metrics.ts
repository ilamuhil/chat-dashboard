import { fromWorkspaceInput } from './follow-ups'
import { z } from 'zod'

export const stages = [
  'new_enquiry',
  'qualified',
  'counselling_requested',
  'contacted',
  'application_started',
  'enrolled',
  'lost',
] as const
export type AnalyticsLead = {
  id: string
  capturedAt: string
  pipelineStage: string | null
  courseInterest: string | null
  source: string
  sourceId?: string
  ownerId: string | null
  ownerName: string
  requestCount: number
  reviewCount: number
  lostReason: string | null
  visits: { stage: string; at: string }[]
}
export function parseReportingWindow(
  from?: string,
  to?: string,
  now = new Date(),
) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const earliest = new Date(
    Date.parse(`${today}T00:00:00+05:30`) - 29 * 86400000,
  ).toISOString()
  const defaultFrom = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(earliest))
  const schema = z.iso.date()
  const start = schema.parse(from || defaultFrom),
    end = schema.parse(to || today)
  if (start > end)
    throw new Error('The start date must be on or before the end date.')
  const startAt = new Date(fromWorkspaceInput(`${start}T00:00`)!),
    endAt = new Date(Date.parse(fromWorkspaceInput(`${end}T00:00`)!) + 86400000)
  if (endAt.getTime() - startAt.getTime() > 366 * 86400000)
    throw new Error('Choose a reporting window of at most one year.')
  return { from: start, to: end, startAt, endAt }
}
export function summarizeAdmissions(leads: AnalyticsLead[]) {
  const counts = Object.fromEntries(
    stages.map((stage) => [
      stage,
      leads.filter((lead) => (lead.pipelineStage || 'new_enquiry') === stage)
        .length,
    ]),
  ) as Record<(typeof stages)[number] | 'unknown', number>
  counts.unknown = leads.filter(
    (lead) =>
      lead.pipelineStage &&
      !stages.includes(lead.pipelineStage as (typeof stages)[number]),
  ).length
  const total = leads.length
  function breakdown(
    key: (lead: AnalyticsLead) => string,
    label: (lead: AnalyticsLead) => string = key,
  ) {
    const groups = new Map<string, AnalyticsLead[]>()
    for (const lead of leads) {
      const id = key(lead)
      groups.set(id, [...(groups.get(id) || []), lead])
    }
    return [...groups]
      .map(([id, rows]) => ({
        id,
        label: label(rows[0]),
        total: rows.length,
        qualified: rows.filter((row) => row.pipelineStage === 'qualified')
          .length,
        enrolled: rows.filter((row) => row.pipelineStage === 'enrolled').length,
        lost: rows.filter((row) => row.pipelineStage === 'lost').length,
        needsReview: rows.reduce((sum, row) => sum + row.reviewCount, 0),
        conversion: rows.length
          ? rows.filter((row) => row.pipelineStage === 'enrolled').length /
            rows.length
          : null,
      }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
  }
  const progressStages = stages.filter(
    (stage) => !['lost', 'enrolled'].includes(stage),
  )
  const progression = progressStages.map((stage) => {
    const reached = leads.filter((lead) =>
      lead.visits.some((visit) => visit.stage === stage),
    )
    const rank = stages.indexOf(stage)
    let progressed = 0,
      lostBeforeProgress = 0,
      stillOpen = 0
    for (const lead of reached) {
      const first = Math.min(
        ...lead.visits
          .filter((visit) => visit.stage === stage)
          .map((visit) => Date.parse(visit.at)),
      )
      const advanced = lead.visits.some(
        (visit) =>
          visit.stage !== 'lost' &&
          stages.indexOf(visit.stage as (typeof stages)[number]) > rank &&
          Date.parse(visit.at) > first,
      )
      if (advanced) progressed++
      else if (lead.pipelineStage === 'lost') lostBeforeProgress++
      else stillOpen++
    }
    return {
      stage,
      reached: reached.length,
      progressed,
      lostBeforeProgress,
      stillOpen,
      dropOff: reached.length ? lostBeforeProgress / reached.length : null,
    }
  })
  return {
    total,
    counts,
    conversion: total ? counts.enrolled / total : null,
    requests: leads.reduce((sum, lead) => sum + lead.requestCount, 0),
    requestLeads: leads.filter(
      (lead) =>
        lead.requestCount > 0 || lead.pipelineStage === 'counselling_requested',
    ).length,
    needsReview: leads.reduce((sum, lead) => sum + lead.reviewCount, 0),
    progression,
    byCourse: breakdown(
      (lead) =>
        lead.courseInterest?.trim().toLocaleLowerCase() || 'Not recorded',
      (lead) => lead.courseInterest?.trim() || 'Not recorded',
    ),
    bySource: breakdown(
      (lead) => lead.sourceId || lead.source,
      (lead) => lead.source,
    ),
    byCounsellor: breakdown(
      (lead) => lead.ownerId || 'unassigned',
      (lead) => (lead.ownerId ? lead.ownerName : 'Unassigned'),
    ),
    lostReasons: [
      ...leads
        .filter((lead) => lead.pipelineStage === 'lost')
        .reduce((groups, lead) => {
          const label =
            lead.lostReason?.trim().toLocaleLowerCase() ||
            'Not recorded (legacy)'
          groups.set(label, (groups.get(label) || 0) + 1)
          return groups
        }, new Map<string, number>()),
    ]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
  }
}
