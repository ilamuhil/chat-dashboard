'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { billingDetailsSchema } from '@/lib/billing/details'
import Script from 'next/script'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Check,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  Download,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  PLANS,
  CREDIT_PACK,
  money,
  type Limits,
  type PlanId,
} from '@/lib/billing/catalog'
import {
  BillingTaxBreakdown,
  type TaxQuote,
} from '@/components/billing-tax-breakdown'
import { INDIAN_STATES, invoiceAvailableAt } from '@/lib/billing/tax'
type Details = {
  name: string
  email: string
  phone: string
  address: string
  gstin: string
  stateCode: string
}
type Payment = {
  id: string
  status: string
  kind: string
  amountPaise: number
  paidAt: string | null
  receiptNumber: string | null
  invoiceNumber: string | null
  failureReason: string | null
  snapshot?: { demo?: boolean; planName?: string }
}
type Summary = {
  account: {
    planId: PlanId
    status: string
    limits: Limits
    trialEndsAt: string
    paidThrough: string | null
    graceUntil: string | null
    cancelAtPeriodEnd: boolean
    pendingPlanId: PlanId | null
    providerSubscriptionId: string | null
    providerStatus: string | null
    billingDetails: Partial<Details>
  }
  organization: { name: string; email: string | null; phone: string | null }
  period: {
    replyLimit: number
    repliesUsed: number
    repliesReserved: number
    trainingUsed: number
    trainingReserved: number
    trainingLimit: number
    endsAt: string
  } | null
  usage: {
    members: number
    bots: number
    storageBytes: number
    sources: number
    corpusTokens: number
    leads: number
  }
  packs: {
    id: string
    replies: number
    used: number
    reserved: number
    expiresAt: string
  }[]
  payments: Payment[]
  checkouts: (TaxQuote & {
    id: string
    kind: string
    status: string
    planId: string
    expiresAt: string
  })[]
  active: boolean
  canManage: boolean
  mode: 'sandbox' | 'production'
  configured: boolean
  quotes: Record<'starter' | 'growth' | 'pack', TaxQuote>
}
type CashfreeInstance = {
  checkout: (options: {
    paymentSessionId: string
    redirectTarget: string
  }) => Promise<unknown>
  subscriptionsCheckout: (options: {
    subsSessionId: string
    redirectTarget: string
  }) => Promise<unknown>
}
declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeInstance
  }
}
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—'
const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15'
function Meter({
  label,
  used,
  limit,
  suffix = '',
}: {
  label: string
  used: number
  limit: number
  suffix?: string
}) {
  const percentage = Math.min(100, limit ? (used / limit) * 100 : 100)
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}
          {suffix}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${percentage >= 95 ? 'bg-amber-500' : 'bg-sky-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
function useBillingSummary() {
  return useQuery<Summary>({
    queryKey: ['billing-summary'],
    queryFn: async () => {
      const response = await fetch('/api/billing', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load billing.')
      return data
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })
}
export function BillingPanel({
  checkoutReview,
}: {
  checkoutReview?: {
    planId: 'starter' | 'growth'
    kind: 'pack' | 'subscription'
  }
}) {
  const { data: summary, error: loadError, refetch } = useBillingSummary()
  const router = useRouter()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    action: 'checkout' | 'change_plan' | 'cancel'
    planId?: 'starter' | 'growth'
    kind?: 'pack' | 'subscription'
  } | null>(checkoutReview ? { action: 'checkout', ...checkoutReview } : null)
  const [accepted, setAccepted] = useState(false)
  const load = useCallback(async () => {
    await refetch()
  }, [refetch])
  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      setError('')
      setNotice('')
      try {
        const response = await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const result = await response.json()
        if (!response.ok)
          throw new Error(
            result.error || 'Could not complete this billing action.',
          )
        if (body.action === 'checkout') {
          if (!window.Cashfree)
            throw new Error(
              'Secure checkout is still loading. Please try again.',
            )
          const cashfree = window.Cashfree({ mode: result.mode })
          if (result.kind === 'pack')
            await cashfree.checkout({
              paymentSessionId: result.sessionId,
              redirectTarget: '_self',
            })
          else
            await cashfree.subscriptionsCheckout({
              subsSessionId: result.sessionId,
              redirectTarget: '_self',
            })
        } else {
          setNotice(
            body.action === 'cancel'
              ? 'Future renewals are cancelled. Your paid access continues until the date shown below.'
              : body.action === 'retry'
                ? 'Retry requested. Cashfree will notify you before collection. Your allowance updates after verified payment.'
                : body.action === 'change_plan'
                  ? 'Your plan change is scheduled for the next successful renewal.'
                  : 'Payment status refreshed.',
          )
          await load()
        }
        setConfirmation(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [load],
  )
  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get('checkout')
    if (!checkout || !/^[\da-f-]{36}$/.test(checkout)) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const refresh = async () => {
      try {
        const response = await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh', checkoutId: checkout }),
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        await refetch()
        if (controller.signal.aborted) return
        if (['active', 'paid'].includes(data.checkoutStatus)) {
          setNotice('Payment verified. Your updated allowance is ready.')
        } else if (['failed', 'cancelled'].includes(data.checkoutStatus)) {
          setNotice(
            'Payment was not completed. You can review it below and try again.',
          )
        } else if (++attempts < 24) {
          setNotice(
            'Waiting for payment confirmation. This page will update automatically.',
          )
          timer = setTimeout(refresh, 5000)
        } else {
          setNotice(
            'Payment confirmation is still pending. Use Refresh status to check again.',
          )
        }
      } catch (error) {
        if (!(error instanceof Error)) return
        if (!controller.signal.aborted) setError(error.message)
      }
    }
    void refresh()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [refetch])
  const ask = (value: NonNullable<typeof confirmation>) => {
    if (
      value.action === 'checkout' &&
      !billingDetailsSchema.safeParse(summary?.account.billingDetails).success
    ) {
      router.push(
        `/dashboard/billing?plan=${value.planId}&kind=${value.kind || 'subscription'}`,
      )
      return
    }
    setAccepted(false)
    setConfirmation(value)
  }
  if (!summary)
    return (
      <div className="dashboard-surface rounded-xl p-8">
        {error || loadError ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-red-600">
              {error || loadError?.message}
            </p>
            <Button
              variant="outline"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div
            role="status"
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            Loading your organization’s billing…
          </div>
        )}
      </div>
    )
  const { account, period, usage, canManage, quotes } = summary
  const current = PLANS[account.planId] || PLANS.trial
  const selectedPending =
    confirmation?.action === 'checkout'
      ? summary.checkouts.find(
          (c) =>
            c.kind === confirmation.kind &&
            c.planId === confirmation.planId &&
            ['creating', 'ready', 'authorized', 'failed'].includes(c.status) &&
            new Date(c.expiresAt) > new Date(),
        )
      : undefined
  const selected =
    selectedPending ||
    (confirmation?.kind === 'pack'
      ? quotes.pack
      : confirmation?.planId
        ? quotes[confirmation.planId]
        : null)
  const pending = summary.checkouts.find((c) =>
    ['creating', 'ready', 'authorized', 'failed'].includes(c.status),
  )
  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onReady={() => setSdkReady(true)}
        onError={() =>
          setError(
            'Secure checkout could not load. Please check your connection and try again.',
          )
        }
      />
      {summary.mode === 'sandbox' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldCheck className="size-4 shrink-0" />
          Sandbox billing · Use Cashfree test payment details. No real money is
          collected.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {notice}
        </p>
      )}
      {canManage && (
        <section className="dashboard-surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-5">
          <div>
            <h2 className="text-sm font-semibold">Billing & invoices</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage your billing details, payment history and PDF invoices.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/billing">
              Manage billing & invoices{' '}
              <ArrowUpRight className="ml-2 size-3.5" />
            </Link>
          </Button>
        </section>
      )}
      <section className="dashboard-surface rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {summary.organization.name || 'Your organization'}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <CreditCard className="size-5 text-sky-700" />
              <h2 className="text-xl font-semibold">{current.name}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${summary.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}
              >
                {account.cancelAtPeriodEnd
                  ? 'Renewal cancelled'
                  : summary.active
                    ? account.status.replaceAll('_', ' ')
                    : 'Access paused'}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {account.planId === 'trial'
                ? `Trial ends ${date(account.trialEndsAt)}`
                : `${account.cancelAtPeriodEnd ? 'Access until' : 'Paid through'} ${date(account.paidThrough)}`}
              {account.pendingPlanId &&
                ` · ${PLANS[account.pendingPlanId].name} from next paid renewal`}
            </p>
          </div>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void act({ action: 'refresh' })}
            >
              <RefreshCw
                className={`mr-2 size-3.5 ${busy ? 'animate-spin' : ''}`}
              />
              Refresh payment status
            </Button>
          )}
        </div>
        {account.status === 'past_due' && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Your renewal payment failed. Remaining replies stay available until{' '}
            {date(account.graceUntil)}. Update your payment through Cashfree or
            retry the payment below.
          </p>
        )}
        {canManage &&
          account.status === 'past_due' &&
          !account.cancelAtPeriodEnd &&
          summary.payments.find(
            (p) => p.kind === 'CHARGE' && p.status === 'FAILED',
          ) && (
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const payment = summary.payments.find(
                  (p) => p.kind === 'CHARGE' && p.status === 'FAILED',
                )
                if (payment)
                  void act({ action: 'retry', paymentId: payment.id })
              }}
            >
              Retry failed renewal
            </Button>
          )}
        {pending && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-xs">
            <span>
              Checkout{' '}
              {pending.status === 'authorized'
                ? 'authorized. Waiting for verified payment collection.'
                : 'is pending. Complete checkout or refresh its status.'}
            </span>
            {canManage && new Date(pending.expiresAt) > new Date() && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !sdkReady}
                onClick={() =>
                  ask({
                    action: 'checkout',
                    planId: pending.planId as 'starter' | 'growth',
                    kind: pending.kind as 'pack' | 'subscription',
                  })
                }
              >
                Resume checkout
              </Button>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void act({ action: 'abandon', checkoutId: pending.id })
                }
              >
                Cancel pending checkout
              </Button>
            )}
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Meter
            label="AI replies"
            used={(period?.repliesUsed || 0) + (period?.repliesReserved || 0)}
            limit={period?.replyLimit || 0}
          />
          <Meter
            label="Team members"
            used={usage.members}
            limit={account.limits.members}
          />
          <Meter label="Bots" used={usage.bots} limit={account.limits.bots} />
          <Meter
            label="Uploaded files"
            used={Math.round((usage.storageBytes / 1_000_000) * 10) / 10}
            limit={account.limits.storageBytes / 1_000_000}
            suffix=" MB"
          />
          <Meter
            label="Training sources"
            used={usage.sources}
            limit={account.limits.sources}
          />
          <Meter
            label="Training tokens this cycle"
            used={(period?.trainingUsed || 0) + (period?.trainingReserved || 0)}
            limit={period?.trainingLimit || 0}
          />
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Included usage{' '}
          {account.planId === 'trial'
            ? 'is a one-time trial allowance'
            : `renews after successful payment, next period ${date(period?.endsAt || null)}`}
          . Test chats count. Lead capture and human handoff remain available
          when AI replies run out.
        </p>
        {summary.packs.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
            {summary.packs.map((pack) => (
              <p key={pack.id}>
                {pack.replies - pack.used - pack.reserved} additional replies ·
                expires {date(pack.expiresAt)}
              </p>
            ))}
          </div>
        )}
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Choose your capacity</h2>
          <Link
            href="/pricing"
            className="flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300"
          >
            Full plan details
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(['starter', 'growth'] as const).map((id) => {
            const plan = PLANS[id]
            const active = account.planId === id && !account.cancelAtPeriodEnd
            return (
              <article
                key={id}
                className={`dashboard-surface flex flex-col rounded-xl p-5 ${active ? 'ring-1 ring-sky-500/40' : ''}`}
              >
                <div className="flex justify-between gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {active && (
                    <span className="text-xs text-sky-700 dark:text-sky-300">
                      Current plan
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.description}
                </p>
                <p className="mt-5 text-2xl font-semibold">
                  {money(plan.pricePaise)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    / month + applicable tax
                  </span>
                </p>
                <ul className="my-5 grid flex-1 gap-2 text-xs text-muted-foreground">
                  {[
                    `${plan.limits.replies.toLocaleString('en-IN')} AI replies per cycle`,
                    `${plan.limits.members} members · ${plan.limits.bots} ${plan.limits.bots === 1 ? 'bot' : 'bots'} · 1 organization`,
                    `${plan.limits.storageBytes / 1_000_000} MB uploads · ${plan.limits.sources} sources`,
                    'Lead capture and counsellor handoff included',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="size-3.5 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={
                    !canManage ||
                    busy ||
                    !summary.configured ||
                    !sdkReady ||
                    active
                  }
                  onClick={() =>
                    ask({
                      action:
                        account.providerSubscriptionId &&
                        !account.cancelAtPeriodEnd &&
                        account.paidThrough
                          ? 'change_plan'
                          : 'checkout',
                      planId: id,
                      kind: 'subscription',
                    })
                  }
                >
                  {active
                    ? 'Current plan'
                    : account.paidThrough && !account.cancelAtPeriodEnd
                      ? 'Change at next renewal'
                      : 'Choose plan'}
                </Button>
              </article>
            )
          })}
        </div>
        {!summary.configured && (
          <p className="mt-3 text-xs text-amber-700">
            Checkout will be available once Cashfree sandbox credentials are
            configured.
          </p>
        )}
        {!canManage && (
          <p className="mt-3 text-xs text-muted-foreground">
            Ask an organization administrator to change the plan or manage
            payments.
          </p>
        )}
      </section>
      {canManage && summary.active && account.planId !== 'trial' && (
        <section className="dashboard-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
          <div>
            <h2 className="text-sm font-semibold">A little extra capacity</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              1,000 standard replies for {money(CREDIT_PACK.pricePaise)} +
              applicable tax. Expires 90 days after payment. No automatic
              recharge.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={busy || !sdkReady}
            onClick={() =>
              ask({
                action: 'checkout',
                planId: account.planId as 'starter' | 'growth',
                kind: 'pack',
              })
            }
          >
            Add replies
          </Button>
        </section>
      )}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5">
        <div>
          <h2 className="text-sm font-medium">Your data, your choice</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Export your organization’s records before changing or ending your
            subscription.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button asChild size="sm" variant="outline">
              <a href="/api/billing/export">Export records</a>
            </Button>
          )}
          {canManage &&
            account.providerSubscriptionId &&
            !account.cancelAtPeriodEnd && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => ask({ action: 'cancel' })}
              >
                Cancel renewal
              </Button>
            )}
        </div>
      </section>
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!busy && !open) setConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmation?.action === 'cancel'
                ? 'Cancel future renewals?'
                : confirmation?.action === 'change_plan'
                  ? 'Confirm your next plan'
                  : 'Review your payment'}
            </DialogTitle>
            <DialogDescription>
              {confirmation?.action === 'cancel'
                ? `Your paid access stays available until ${date(account.paidThrough)}. No further renewals will be collected.`
                : confirmation?.action === 'change_plan'
                  ? 'Your current allowance stays unchanged. The new allowance starts after the next successful renewal payment.'
                  : `This purchase is for ${summary.organization.name || 'your selected organization'}. Check the total before continuing to Cashfree.`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-lg bg-muted/50 p-4">
              <BillingTaxBreakdown quote={selected} />
            </div>
          )}
          {confirmation?.action === 'checkout' &&
            !billingDetailsSchema.safeParse(account.billingDetails).success && (
              <Link
                className="text-sm text-sky-700 underline"
                href={`/dashboard/billing?plan=${confirmation.planId}&kind=${confirmation.kind || 'subscription'}`}
              >
                Complete billing details before payment
              </Link>
            )}
          {confirmation?.action !== 'cancel' && (
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1"
              />
              <span>
                {confirmation?.kind === 'pack'
                  ? 'I understand this is a one-time purchase, expires in 90 days and requires an active paid subscription to use.'
                  : 'I authorize monthly recurring billing at the displayed amount. The mandate maximum supports the Growth plan; only my selected plan is charged. I can cancel future renewals in Billing.'}{' '}
                <Link className="underline" href="/terms" target="_blank">
                  Terms
                </Link>
              </span>
            </label>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Keep reviewing
            </Button>
            <Button
              disabled={
                busy ||
                (confirmation?.action === 'checkout' &&
                  !billingDetailsSchema.safeParse(account.billingDetails)
                    .success) ||
                (confirmation?.action !== 'cancel' &&
                  (!accepted ||
                    Boolean(selected?.taxPaise && !selected.taxBreakdown)))
              }
              onClick={() => confirmation && void act(confirmation)}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {confirmation?.action === 'cancel'
                ? 'Cancel renewal'
                : confirmation?.action === 'change_plan'
                  ? 'Schedule change'
                  : 'Continue to Cashfree'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
function BillingDetails({
  summary,
  onSaved,
  onError,
  continueCheckout = false,
}: {
  summary: Summary
  continueCheckout?: boolean
  onSaved: () => Promise<void>
  onError: (message: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const details = summary.account.billingDetails
  return (
    <section className="dashboard-surface rounded-xl p-5">
      <h2 className="text-sm font-semibold">Billing details</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Required before payment. GSTIN is optional. Changes do not rewrite
        previous receipts.
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          setSaving(true)
          setSaved(false)
          try {
            const response = await fetch('/api/billing', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.fromEntries(form)),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            await onSaved()
            setSaved(true)
          } catch (error) {
            onError(
              error instanceof Error
                ? error.message
                : 'Could not save billing details.',
            )
          } finally {
            setSaving(false)
          }
        }}
      >
        {(
          [
            {
              name: 'name',
              label: 'Billing name / business name',
              value: details.name || summary.organization.name || '',
              required: true,
            },
            {
              name: 'email',
              label: 'Billing email',
              value: details.email || summary.organization.email || '',
              required: true,
              type: 'email',
            },
            {
              name: 'phone',
              label: 'Indian phone number',
              value: details.phone || summary.organization.phone || '',
              required: true,
              type: 'tel',
            },
            {
              name: 'gstin',
              label: 'GSTIN (optional)',
              value: details.gstin || '',
            },
            {
              name: 'address',
              label: 'Billing address',
              value: details.address || '',
              required: true,
            },
          ] as const
        ).map((field) => (
          <label key={field.name} className="text-xs text-muted-foreground">
            {field.label}
            <input
              name={field.name}
              defaultValue={field.value}
              type={'type' in field ? field.type : 'text'}
              required={'required' in field && field.required}
              minLength={
                field.name === 'address'
                  ? 10
                  : field.name === 'name'
                    ? 2
                    : undefined
              }
              pattern={field.name === 'phone' ? '[0-9]{10}' : undefined}
              maxLength={field.name === 'address' ? 1000 : 120}
              className={inputClass}
            />
          </label>
        ))}
        <label className="text-xs text-muted-foreground">
          Billing state (place of supply)
          <select
            name="stateCode"
            required
            defaultValue={details.stateCode || details.gstin?.slice(0, 2) || ''}
            className={inputClass}
          >
            <option value="">Choose a state</option>
            {INDIAN_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <Button variant="outline" disabled={saving} type="submit">
            {saving
              ? 'Saving…'
              : continueCheckout
                ? 'Save and review payment'
                : 'Save billing details'}
          </Button>
          {saved && (
            <span role="status" className="pb-2 text-xs text-emerald-700">
              Saved
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function InvoiceDownload({
  payment,
  onError,
}: {
  payment: Payment
  onError: (value: string) => void
}) {
  const [downloading, setDownloading] = useState(false)
  const available = invoiceAvailableAt(payment.paidAt!)
  if (available > new Date())
    return (
      <span className="mt-1 block whitespace-nowrap text-[10px] text-muted-foreground">
        PDF available {date(available.toISOString())}
      </span>
    )
  return (
    <button
      type="button"
      disabled={downloading}
      className="mt-2 inline-flex items-center gap-1 whitespace-nowrap text-sky-700 disabled:opacity-50 dark:text-sky-300"
      onClick={async () => {
        setDownloading(true)
        try {
          const response = await fetch(
            `/api/billing/invoices/${encodeURIComponent(payment.id)}`,
            { cache: 'no-store' },
          )
          if (!response.ok) {
            const body = await response.json()
            throw new Error(body.error || 'Could not download the invoice.')
          }
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download =
            response.headers
              .get('content-disposition')
              ?.match(/filename="([^"]+)"/)?.[1] || 'invoice.pdf'
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (error) {
          onError(
            error instanceof Error
              ? error.message
              : 'Could not download the invoice.',
          )
        } finally {
          setDownloading(false)
        }
      }}
    >
      <Download className="size-3.5" />
      {downloading ? 'Generating…' : 'Download PDF'}
    </button>
  )
}

function PaymentHistory({
  summary,
  onError,
}: {
  summary: Summary
  onError: (message: string) => void
}) {
  return (
    <section className="dashboard-surface rounded-xl p-5">
      <h2 className="text-sm font-semibold">Payments & invoices</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Payment status is verified with Cashfree. Sandbox receipts are test
        documents. PDF invoices unlock seven days after payment and are
        generated when requested.
      </p>
      {summary.payments.some((payment) => payment.snapshot?.demo) && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Sample invoices are preview records. They do not change your plan or
          allowance.
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-3 font-medium">Date</th>
              <th className="font-medium">Payment</th>
              <th className="font-medium">Amount</th>
              <th className="font-medium">Status</th>
              <th className="text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {summary.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border/50">
                <td className="py-3">{date(payment.paidAt)}</td>
                <td className="py-3 pr-4">
                  {payment.snapshot?.planName ||
                    (payment.kind === 'pack'
                      ? 'AI reply pack'
                      : 'Subscription')}
                  {payment.snapshot?.demo && (
                    <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                      Sample
                    </span>
                  )}
                  {payment.invoiceNumber && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {payment.invoiceNumber}
                    </p>
                  )}
                  {payment.failureReason && (
                    <p className="mt-1 max-w-xs text-muted-foreground">
                      {payment.failureReason}
                    </p>
                  )}
                </td>
                <td className="tabular-nums">{money(payment.amountPaise)}</td>
                <td>{payment.status.toLowerCase().replaceAll('_', ' ')}</td>
                <td className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    {payment.receiptNumber ? (
                      <a
                        className="inline-flex gap-1 text-sky-700 dark:text-sky-300"
                        href={`/dashboard/billing/invoices/${encodeURIComponent(payment.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-3.5" />
                        Receipt
                      </a>
                    ) : (
                      '—'
                    )}
                    {payment.receiptNumber && payment.paidAt && (
                      <InvoiceDownload payment={payment} onError={onError} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.payments.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No payments yet. Your receipts will appear here.
          </p>
        )}
      </div>
    </section>
  )
}

export function BillingManagement({
  intent = null,
}: {
  intent?: { plan: 'starter' | 'growth'; kind: 'pack' | 'subscription' } | null
}) {
  const { data: summary, error: loadError, refetch } = useBillingSummary()
  const [error, setError] = useState('')
  const router = useRouter()
  if (!summary)
    return (
      <div role="status" className="dashboard-surface rounded-xl p-6">
        {loadError?.message || 'Loading billing details…'}
      </div>
    )
  return (
    <>
      <Link
        href="/dashboard/subscription"
        className="inline-flex text-sm text-sky-700 dark:text-sky-300"
      >
        ← Subscription & usage
      </Link>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {intent && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          Complete your billing details to review your{' '}
          {intent.kind === 'pack'
            ? 'reply pack'
            : PLANS[intent.plan as 'starter' | 'growth'].name +
              ' subscription'}{' '}
          payment.
        </p>
      )}
      {summary.canManage ? (
        <>
          <BillingDetails
            summary={summary}
            onError={setError}
            continueCheckout={Boolean(intent)}
            onSaved={async () => {
              await refetch()
              if (intent)
                router.push(
                  `/dashboard/subscription?review=1&plan=${intent.plan}&kind=${intent.kind}`,
                )
            }}
          />
          <PaymentHistory summary={summary} onError={setError} />
        </>
      ) : (
        <p className="dashboard-surface rounded-xl p-6 text-sm text-muted-foreground">
          Only organization administrators can manage billing details and
          invoices.
        </p>
      )}
    </>
  )
}
