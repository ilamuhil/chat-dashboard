'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query'
import { RefreshCw, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { followUpLabel, formatFollowUpDate } from '@/lib/leads/follow-ups'
import type { AdmissionsReport } from '@/lib/leads/analytics'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not load report')
  return data
}
function percentage(value: number | null) {
  return value === null
    ? '—'
    : `${(value * 100).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
}
function ReportLoading() {
  return (
    <div
      role='status'
      aria-label='Loading admissions report'
      className='space-y-4'>
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className='h-24 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-64 w-full rounded-xl' />
    </div>
  )
}
type QuestionReport = {
  rows: {
    id: string
    conversation_id: string | null
    question: string
    status: string
    created_at: string
  }[]
  counts: Record<string, number>
  total: number
  page: number
  limit: number
}
const signalLabels: Record<string, string> = {
  no_evidence: 'Missing evidence',
  needs_clarification: 'Clarification needed',
  unavailable: 'Retrieval unavailable',
}
function Questions({ from, to }: { from: string; to: string }) {
  const [status, setStatus] = useState('all'),
    [page, setPage] = useState(1)
  const params = new URLSearchParams({ from, to, status, page: String(page) })
  const query = useQuery({
    queryKey: ['admissions-questions', from, to, status, page],
    queryFn: ({ signal }) =>
      getJson<QuestionReport>(
        `/api/dashboard/admissions/unanswered?${params}`,
        signal,
      ),
    retry: false,
    staleTime: 30000,
  })
  return (
    <section className='space-y-4' aria-label='Unanswered enquiry reporting'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-base font-semibold'>
            Unanswered enquiries to review
          </h2>
          <p className='mt-1 max-w-3xl text-xs leading-5 text-muted-foreground'>
            Missing evidence, clarification requests and retrieval failures from
            logged chatbot turns during this period. Review the conversation
            before judging the final answer. A successful retry removes an
            earlier signal for the same message.
          </p>
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}>
          <SelectTrigger aria-label='Filter enquiry signal' className='w-52'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All review signals</SelectItem>
            {Object.entries(signalLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isPending ? (
        <ReportLoading />
      ) : query.isError ? (
        <div
          role='alert'
          className='rounded-xl border border-border bg-card p-6'>
          <p className='text-sm'>{query.error.message}</p>
          <Button
            variant='outline'
            size='sm'
            className='mt-3'
            onClick={() => void query.refetch()}>
            Retry question reporting
          </Button>
        </div>
      ) : (
        <>
          <div className='flex flex-wrap gap-2'>
            {Object.entries(signalLabels).map(([value, label]) => (
              <Badge key={value} variant='secondary'>
                {label}: {query.data.counts[value] || 0}
              </Badge>
            ))}
          </div>
          <div className='dashboard-surface overflow-hidden rounded-xl'>
            {query.data.rows.length ? (
              <ol className='divide-y divide-border'>
                {query.data.rows.map((row) => (
                  <li key={row.id} className='p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <Badge variant='outline'>
                        {signalLabels[row.status] || row.status}
                      </Badge>
                      <time className='text-xs text-muted-foreground'>
                        {formatFollowUpDate(row.created_at)} IST
                      </time>
                    </div>
                    <p className='mt-3 whitespace-pre-wrap break-words text-sm'>
                      {row.question}
                    </p>
                    {row.conversation_id && (
                      <Link
                        className='mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline'
                        href={`/dashboard/users/conversations/${row.conversation_id}`}>
                        Review conversation
                        <ArrowRight className='size-3' />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className='p-10 text-center'>
                <h3 className='text-sm font-medium'>
                  No review signals in this view
                </h3>
                <p className='mt-2 text-xs text-muted-foreground'>
                  This reflects available retrieval logs, not proof that every
                  enquiry was answered.
                </p>
              </div>
            )}
            <div className='flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground'>
              <span>
                {query.data.total} signals · Page {page} of{' '}
                {Math.max(1, Math.ceil(query.data.total / query.data.limit))}
              </span>
              <div className='flex gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Previous questions page'
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}>
                  <ChevronLeft className='size-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Next questions page'
                  disabled={page * query.data.limit >= query.data.total}
                  onClick={() => setPage(page + 1)}>
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
function Summary({ data }: { data: AdmissionsReport }) {
  const [group, setGroup] = useState<'byCourse' | 'bySource' | 'byCounsellor'>(
    'byCourse',
  )
  const cards = [
    ['Captured leads', data.total],
    ['Qualified now', data.counts.qualified],
    ['Counselling request leads', data.requestLeads],
    ['Enrolled now', data.counts.enrolled],
    ['Lost now', data.counts.lost],
    ['Enrolment conversion', percentage(data.conversion)],
  ]
  return (
    <div className='space-y-5'>
      <section
        className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'
        aria-label='Admissions metrics'>
        {cards.map(([label, value]) => (
          <div key={label} className='dashboard-surface rounded-xl p-4'>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className='mt-2 text-2xl font-semibold tabular-nums'>{value}</p>
          </div>
        ))}
      </section>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3'>
        <p className='text-xs text-muted-foreground'>
          {data.requests} saved callback/demo/visit requests ·{' '}
          {data.needsReview} activities need review. Counts refer to leads
          captured in this cohort.
        </p>
        <Button asChild variant='outline' size='sm'>
          <Link href='/dashboard/users/follow-ups'>
            Review follow-ups
            <ArrowRight className='size-3' />
          </Link>
        </Button>
      </div>
      {!data.total ? (
        <div className='dashboard-surface rounded-xl p-10 text-center'>
          <h2 className='text-sm font-semibold'>
            No leads captured in this period
          </h2>
          <p className='mt-2 text-xs text-muted-foreground'>
            Choose different dates to inspect another lead cohort.
          </p>
        </div>
      ) : (
        <>
          <div className='grid gap-4 xl:grid-cols-2'>
            <section
              className='dashboard-surface rounded-xl p-4'
              aria-label='Current pipeline distribution'>
              <h2 className='text-sm font-semibold'>Current pipeline</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                One current stage per lead. Source: saved lead records.
              </p>
              <div className='mt-5 space-y-3'>
                {Object.entries(data.counts)
                  .filter(([stage, count]) => stage !== 'unknown' || count > 0)
                  .map(([stage, count]) => (
                    <div key={stage}>
                      <div className='mb-1 flex justify-between text-xs'>
                        <span>{followUpLabel(stage)}</span>
                        <span className='tabular-nums'>
                          {count} · {percentage(count / data.total)}
                        </span>
                      </div>
                      <div className='h-2 overflow-hidden rounded bg-muted'>
                        <div
                          className={`h-full rounded ${stage === 'lost' ? 'bg-slate-500' : stage === 'enrolled' ? 'bg-emerald-600' : 'bg-sky-600'}`}
                          style={{ width: `${(count / data.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
            <section className='dashboard-surface overflow-hidden rounded-xl p-4'>
              <h2 className='text-sm font-semibold'>
                Observed funnel progression
              </h2>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                Applicants may skip or revisit stages. Each row counts leads
                explicitly observed at that stage, then distinguishes later
                progress, loss before progress and work still open.
              </p>
              <div className='mt-4 overflow-x-auto'>
                <table className='w-full min-w-105 text-left text-xs'>
                  <thead className='border-b border-border text-muted-foreground'>
                    <tr>
                      {[
                        'Stage',
                        'Reached',
                        'Progressed',
                        'Lost before progress',
                        'Still open',
                      ].map((label) => (
                        <th key={label} className='p-2 font-medium'>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.progression.map((row) => (
                      <tr
                        key={row.stage}
                        className='border-b border-border last:border-0'>
                        <th className='p-2 font-medium'>
                          {followUpLabel(row.stage)}
                        </th>
                        <td className='p-2 tabular-nums'>{row.reached}</td>
                        <td className='p-2 tabular-nums'>{row.progressed}</td>
                        <td className='p-2 tabular-nums'>
                          {row.lostBeforeProgress}{' '}
                          <span className='text-muted-foreground'>
                            ({percentage(row.dropOff)})
                          </span>
                        </td>
                        <td className='p-2 tabular-nums'>{row.stillOpen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className='mt-3 text-[11px] leading-5 text-muted-foreground'>
                {data.trackingSince
                  ? `History tracking began ${formatFollowUpDate(data.trackingSince)} IST. Earlier stage visits are unavailable.`
                  : 'History is limited to recorded lead creation and workflow events.'}{' '}
                Reached counts can differ across stages; they are not an assumed
                linear funnel.
              </p>
            </section>
          </div>
          <section className='dashboard-surface overflow-hidden rounded-xl'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border p-4'>
              <div>
                <h2 className='text-sm font-semibold'>Operational breakdown</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Current course, source and owner attribution. Conversion =
                  currently enrolled ÷ captured leads.
                </p>
              </div>
              <div
                className='flex flex-wrap gap-1'
                role='group'
                aria-label='Breakdown dimension'>
                {[
                  ['byCourse', 'Course'],
                  ['bySource', 'Source'],
                  ['byCounsellor', 'Counsellor'],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    size='sm'
                    variant={group === value ? 'secondary' : 'ghost'}
                    aria-pressed={group === value}
                    onClick={() => setGroup(value as typeof group)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-130 text-left text-xs'>
                <thead className='border-b border-border bg-muted/30 text-muted-foreground'>
                  <tr>
                    {[
                      'Group',
                      'Leads',
                      'Qualified now',
                      'Enrolled',
                      'Lost',
                      'Needs review',
                      'Conversion',
                    ].map((label) => (
                      <th key={label} className='px-4 py-3 font-medium'>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data[group].map((row) => (
                    <tr
                      key={row.id}
                      className='border-b border-border last:border-0'>
                      <th className='max-w-60 break-words px-4 py-3 font-medium'>
                        {row.label}
                      </th>
                      <td className='px-4 py-3'>{row.total}</td>
                      <td className='px-4 py-3'>{row.qualified}</td>
                      <td className='px-4 py-3'>{row.enrolled}</td>
                      <td className='px-4 py-3'>{row.lost}</td>
                      <td className='px-4 py-3'>{row.needsReview}</td>
                      <td className='px-4 py-3'>
                        {percentage(row.conversion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {!!data.lostReasons.length && (
            <section className='dashboard-surface rounded-xl p-4'>
              <h2 className='text-sm font-semibold'>Current loss reasons</h2>
              <ul className='mt-3 divide-y divide-border'>
                {data.lostReasons.map((row) => (
                  <li
                    key={row.label}
                    className='flex justify-between gap-3 py-2 text-sm'>
                    <span className='break-words'>{row.label}</span>
                    <span className='tabular-nums'>{row.total}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <details className='rounded-xl border border-border p-4 text-xs text-muted-foreground'>
        <summary className='cursor-pointer font-medium text-foreground'>
          Metric definitions and coverage
        </summary>
        <p className='mt-3 leading-5'>
          The selected dates define an inclusive IST capture cohort. Deleted
          leads are excluded. Leads with no saved stage are counted as new
          enquiries; unrecognized stage values are shown separately. Qualified,
          enrolled and lost cards show current stages; conversion uses all
          captured leads as its denominator. Request counts use saved request
          records and are deduplicated by task. Observed progression counts a
          lead once per stage and requires a later recorded forward stage to
          count progress. Current loss before progress is distinct from
          still-open work. Counsellor breakdowns use the current lead owner, not
          historical performance credit. Unanswered-enquiry signals use
          retrieval-log dates during the same reporting window, independently of
          lead capture dates.
        </p>
      </details>
    </div>
  )
}
export default function AdmissionsClient({
  initialWindow,
}: {
  initialWindow: { from: string; to: string }
}) {
  const [window, setWindow] = useState(initialWindow),
    [tab, setTab] = useState('funnel')
  const queryClient = useQueryClient()
  const refreshing =
    useIsFetching({
      queryKey:
        tab === 'questions'
          ? ['admissions-questions', window.from, window.to]
          : ['admissions', window.from, window.to],
    }) > 0
  const params = new URLSearchParams(window)
  const report = useQuery({
    queryKey: ['admissions', window.from, window.to],
    queryFn: ({ signal }) =>
      getJson<AdmissionsReport>(`/api/dashboard/admissions?${params}`, signal),
    staleTime: 30000,
    retry: false,
  })
  return (
    <div className='space-y-5 pb-6'>
      <form
        className='dashboard-surface flex flex-wrap items-end gap-3 rounded-xl p-4'
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          setWindow({
            from: String(form.get('from')),
            to: String(form.get('to')),
          })
        }}>
        <div className='space-y-1.5'>
          <Label htmlFor='admissions-from' className='text-xs'>
            From · IST
          </Label>
          <Input
            id='admissions-from'
            type='date'
            required
            name='from'
            defaultValue={initialWindow.from}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='admissions-to' className='text-xs'>
            Through · IST
          </Label>
          <Input
            id='admissions-to'
            type='date'
            required
            name='to'
            defaultValue={initialWindow.to}
          />
        </div>
        <Button type='submit' className={dashboardButtonClass}>
          Apply dates
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={refreshing}
          onClick={() => {
            if (tab === 'questions')
              void queryClient.invalidateQueries({
                queryKey: ['admissions-questions', window.from, window.to],
              })
            else void report.refetch()
          }}>
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </form>
      <div
        className='flex flex-wrap gap-1'
        role='group'
        aria-label='Admissions views'>
        {[
          ['funnel', 'Funnel and outcomes'],
          ['questions', 'Unanswered enquiries'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'secondary' : 'ghost'}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === 'questions' ? (
        <Questions
          key={`${window.from}:${window.to}`}
          from={window.from}
          to={window.to}
        />
      ) : report.isPending ? (
        <ReportLoading />
      ) : report.isError ? (
        <div role='alert' className='dashboard-surface rounded-xl p-6'>
          <p className='text-sm'>{report.error.message}</p>
          <Button
            className='mt-3'
            variant='outline'
            onClick={() => void report.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <p className='text-xs text-muted-foreground'>
            Capture cohort: {report.data.from} through {report.data.to} ·
            Updated {formatFollowUpDate(report.data.generatedAt)} IST
          </p>
          <Summary data={report.data} />
        </>
      )}
    </div>
  )
}
