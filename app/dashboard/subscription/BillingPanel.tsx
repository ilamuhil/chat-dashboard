'use client'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Check,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLoader } from '@/components/ui/app-loader'
import { PLANS, CREDIT_PACK, money } from '@/lib/billing/catalog'
import { billingDetailsSchema } from '@/lib/billing/details'
import { BillingConfirmationDialog } from './BillingConfirmationDialog'
import { BillingDetails, PaymentHistory } from './BillingDetails'
import { MessageBar, Meter } from './BillingFeedback'
import { useBillingSummary } from './use-billing-summary'
import {
  billingRequest,
  checkoutMessage,
  date,
  packQuote,
  type MessageTone,
} from './billing-utils'
import type {
  BillingAction,
  BillingActionResult,
  Confirmation,
} from './billing-types'
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
export function BillingPanel({
  checkoutReview,
}: {
  checkoutReview?: {
    planId: 'starter' | 'growth'
    kind: 'pack' | 'subscription'
  }
}) {
  const { data: summary, error: loadError } = useBillingSummary()
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutParam = searchParams.get('checkout')
  const returnCheckoutId =
    checkoutParam && /^[\da-f-]{36}$/.test(checkoutParam) ? checkoutParam : ''
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<MessageTone>('info')
  const [sandboxVisible, setSandboxVisible] = useState(true)
  const [dismissedCheckoutStatus, setDismissedCheckoutStatus] = useState('')
  const [sdkReady, setSdkReady] = useState(false)
  const [finishingAction, setFinishingAction] = useState(false)
  const [confirmingReturn, setConfirmingReturn] = useState(
    Boolean(returnCheckoutId),
  )
  const [confirmation, setConfirmation] = useState<Confirmation | null>(
    checkoutReview ? { action: 'checkout', ...checkoutReview } : null,
  )
  const [accepted, setAccepted] = useState(false)
  const [packReplies, setPackReplies] = useState(CREDIT_PACK.replies)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationFeedback, setCancellationFeedback] = useState('')
  const { mutateAsync: runBillingAction, isPending: mutationPending } =
    useMutation({
    mutationFn: (body: BillingAction) =>
      billingRequest<BillingActionResult>('POST', body),
  })
  const busy = mutationPending || finishingAction
  const { mutateAsync: refreshCheckout } = useMutation({
    mutationFn: ({
      checkoutId,
      signal,
    }: {
      checkoutId: string
      signal: AbortSignal
    }) =>
      billingRequest<BillingActionResult>(
        'POST',
        { action: 'refresh', checkoutId },
        signal,
      ),
  })
  const refreshCheckoutRef = useRef(refreshCheckout)
  useEffect(() => {
    refreshCheckoutRef.current = refreshCheckout
  }, [refreshCheckout])
  const load = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
  }, [queryClient])
  const act = useCallback(
    async (body: BillingAction) => {
      setError('')
      setNotice('')
      setFinishingAction(true)
      try {
        const result = await runBillingAction(body)
        if (
          body.action === 'checkout' ||
          body.action === 'resume' ||
          body.action === 'resume_change_plan'
        ) {
          if (!window.Cashfree)
            throw new Error(
              'Secure checkout is still loading. Please try again.',
            )
          const cashfree = window.Cashfree({ mode: result.mode! })
          if (result.kind === 'pack')
            await cashfree.checkout({
              paymentSessionId: result.sessionId!,
              redirectTarget: '_self',
            })
          else
            await cashfree.subscriptionsCheckout({
              subsSessionId: result.sessionId!,
              redirectTarget: '_self',
            })
        } else {
          setNoticeTone(
            body.action === 'retry'
              ? 'info'
              : body.action === 'abandon'
                ? 'warning'
                : 'success',
          )
          setNotice(
            body.action === 'cancel'
              ? 'Future renewals are cancelled. Your paid access continues until the date shown below.'
              : body.action === 'abandon'
                ? 'Pending checkout cancelled. No charge was made.'
              : body.action === 'retry'
                ? 'Retry requested. Your payment provider will notify you before collection. Your allowance updates after verified payment.'
                : body.action === 'change_plan'
                  ? 'Your renewal plan has been updated.'
                  : 'Payment status refreshed.',
          )
          await load()
        }
        setConfirmation(null)
      } catch (e) {
        setConfirmation(null)
        setError(e instanceof Error ? e.message : 'Please try again.')
      } finally {
        setFinishingAction(false)
      }
    },
    [load, runBillingAction],
  )
  useEffect(() => {
    if (!returnCheckoutId) return
    setConfirmingReturn(true)
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const refresh = async () => {
      try {
        const data = await refreshCheckoutRef.current({
          checkoutId: returnCheckoutId,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const checkoutStatus = data.checkoutStatus || ''
        const terminalMessage = checkoutMessage(checkoutStatus)
        let finished = false
        if (terminalMessage) {
          setNoticeTone(terminalMessage.tone)
          setNotice(terminalMessage.message)
          finished = true
        } else if (checkoutStatus === 'pending') {
          setNoticeTone('info')
          setNotice(
            'Payment is pending with the payment provider. This page will update automatically after confirmation.',
          )
          if (++attempts < 24) timer = setTimeout(refresh, 5000)
          else {
            setNoticeTone('warning')
            setNotice(
              'Payment is still pending with the payment provider. Use Refresh payment status to check again.',
            )
            finished = true
          }
        } else if (++attempts < 24) {
          setNoticeTone('info')
          setNotice(
            'Waiting for payment confirmation. This page will update automatically.',
          )
          timer = setTimeout(refresh, 5000)
        } else {
          setNoticeTone('warning')
          setNotice(
            'Payment confirmation is still pending. Use Refresh status to check again.',
          )
          finished = true
        }
        await queryClient.invalidateQueries(
          { queryKey: ['billing-summary'] },
          { cancelRefetch: false },
        )
        if (finished && !controller.signal.aborted) setConfirmingReturn(false)
      } catch (error) {
        if (!(error instanceof Error)) return
        if (!controller.signal.aborted) {
          setError(error.message)
          setConfirmingReturn(false)
        }
      }
    }
    void refresh()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [queryClient, returnCheckoutId])
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
    if (value.action === 'cancel') {
      setCancellationReason('')
      setCancellationFeedback('')
    }
    if (value.kind === 'pack')
      setPackReplies(value.packReplies || CREDIT_PACK.replies)
    setAccepted(false)
    setConfirmation(value)
  }
  const confirmationLoader = (
    <section className="dashboard-surface overflow-hidden rounded-xl">
      <AppLoader
        label="Waiting for confirmation from the payment provider"
        description="Please do not refresh, close this page, or navigate elsewhere while your payment is being verified."
      />
    </section>
  )
  if (!summary) {
    if (confirmingReturn) return confirmationLoader
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
          <AppLoader label="Loading your organization’s billing" />
        )}
      </div>
    )
  }
  const { account, period, usage, canManage, quotes } = summary
  const current = PLANS[account.planId] || PLANS.trial
  const returnCheckoutStatus = summary.checkouts.find(
    (checkout) => checkout.id === returnCheckoutId,
  )?.status
  const returnCheckoutMessage =
    dismissedCheckoutStatus === returnCheckoutStatus
      ? null
      : checkoutMessage(returnCheckoutStatus)
  const visibleNotice = notice || returnCheckoutMessage?.message || ''
  const visibleNoticeTone = notice
    ? noticeTone
    : returnCheckoutMessage?.tone || 'info'
  const selectedPending =
    confirmation?.action === 'checkout' ||
    confirmation?.action === 'resume' ||
    confirmation?.action === 'resume_change_plan'
      ? summary.checkouts.find(
          (c) =>
            c.kind === confirmation.kind &&
            c.planId === confirmation.planId &&
            ['creating', 'ready', 'pending', 'authorized', 'failed'].includes(
              c.status,
            ) &&
            new Date(c.expiresAt) > new Date(),
        )
      : undefined
  const selected =
    selectedPending ||
    (confirmation?.kind === 'pack'
      ? packQuote(quotes.pack, packReplies)
      : confirmation?.planId
        ? quotes[confirmation.planId]
        : null)
  const replacingCancelledRenewal =
    confirmation?.action === 'resume' ||
    confirmation?.action === 'resume_change_plan'
  const undoingPlanChange =
    confirmation?.action === 'change_plan' &&
    confirmation.planId === account.planId &&
    Boolean(account.pendingPlanId)
  const replacementIsDowngrade =
    confirmation?.action === 'resume_change_plan' &&
    Boolean(
      confirmation.planId &&
        PLANS[confirmation.planId].pricePaise < current.pricePaise,
    )
  const pending = summary.checkouts.find((c) =>
    ['creating', 'ready', 'pending', 'authorized', 'failed'].includes(c.status),
  )
  const packReplyLimit = summary.packs.reduce(
    (total, pack) => total + pack.replies,
    0,
  )
  const packReplyUsed = summary.packs.reduce(
    (total, pack) => total + pack.used + pack.reserved,
    0,
  )
  if (confirmingReturn)
    return confirmationLoader
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
      {summary.mode === 'sandbox' && sandboxVisible && (
        <MessageBar tone="warning" onClose={() => setSandboxVisible(false)}>
          <span className="flex items-start gap-2 text-xs">
            <ShieldCheck className="size-4 shrink-0" />
            <span>
              Sandbox billing · Use test payment details. No real money
              is collected.
            </span>
          </span>
        </MessageBar>
      )}
      {error && (
        <MessageBar tone="error" onClose={() => setError('')}>
          {error}
        </MessageBar>
      )}
      {visibleNotice && (
        <MessageBar
          tone={visibleNoticeTone}
          onClose={() => {
            setNotice('')
            if (returnCheckoutStatus)
              setDismissedCheckoutStatus(returnCheckoutStatus)
          }}
        >
          {visibleNotice}
        </MessageBar>
      )}
      {canManage &&
        account.providerSubscriptionId &&
        account.cancelAtPeriodEnd && (
          <section className="dashboard-surface flex flex-wrap items-center justify-between gap-4 rounded-xl border-sky-300 bg-sky-50/70 p-5 ring-1 ring-sky-200 dark:border-sky-700/60 dark:bg-sky-950/20 dark:ring-sky-800/50">
            <div>
              <h2 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                Your renewal is paused
              </h2>
              <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">
                Resume your subscription before {date(account.paidThrough)} to
                keep your {current.name} plan renewing automatically.
              </p>
            </div>
            <Button
              disabled={busy || !summary.configured || !sdkReady}
              onClick={() =>
                ask({
                  action: 'resume',
                  planId: account.planId as 'starter' | 'growth',
                  kind: 'subscription',
                })
              }
            >
              Resume subscription
            </Button>
          </section>
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
            {date(account.graceUntil)}. Update your payment through the payment provider or
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
                    packReplies: pending.packReplies,
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
            used={
              (period?.repliesUsed || 0) +
              (period?.repliesReserved || 0) +
              packReplyUsed
            }
            limit={(period?.replyLimit || 0) + packReplyLimit}
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
            const canKeepCurrentPlan =
              active && Boolean(account.pendingPlanId)
            const ending = account.planId === id && account.cancelAtPeriodEnd
            const isDowngrade = plan.pricePaise < current.pricePaise
            const scheduled = account.pendingPlanId === id
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
                  {scheduled && (
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      Next renewal
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
                    (!sdkReady &&
                      !(
                        account.providerSubscriptionId &&
                        !account.cancelAtPeriodEnd &&
                        account.paidThrough
                      )) ||
                    (active && !canKeepCurrentPlan) ||
                    scheduled
                  }
                  onClick={() => {
                    if (account.cancelAtPeriodEnd)
                      ask({
                        action: ending ? 'resume' : 'resume_change_plan',
                        planId: id,
                        kind: 'subscription',
                      })
                    else
                      ask({
                        action:
                          canKeepCurrentPlan ||
                          (account.providerSubscriptionId &&
                          !account.cancelAtPeriodEnd &&
                          account.paidThrough)
                            ? 'change_plan'
                            : 'checkout',
                        planId: id,
                        kind: 'subscription',
                      })
                  }}
                >
                  {active
                    ? canKeepCurrentPlan
                      ? `Keep ${plan.name}`
                      : 'Current plan'
                    : ending
                      ? 'Resume renewal'
                    : account.cancelAtPeriodEnd
                      ? isDowngrade
                        ? 'Renew & downgrade plan'
                        : 'Renew & upgrade plan'
                    : scheduled
                      ? 'Scheduled for next renewal'
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
            Checkout will be available once payment provider credentials are
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
          <h2 className="text-sm font-medium">Export organization data</h2>
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
                <TriangleAlert className="mr-2 size-3.5 text-red-600 dark:text-red-400" />
                Cancel renewal
              </Button>
            )}
        </div>
      </section>
      <BillingConfirmationDialog
        confirmation={confirmation}
        account={account}
        summary={summary}
        current={current}
        selected={selected || undefined}
        selectedPending={Boolean(selectedPending)}
        replacingCancelledRenewal={replacingCancelledRenewal}
        undoingPlanChange={undoingPlanChange}
        replacementIsDowngrade={replacementIsDowngrade}
        busy={busy}
        sdkReady={sdkReady}
        accepted={accepted}
        packReplies={packReplies}
        cancellationReason={cancellationReason}
        cancellationFeedback={cancellationFeedback}
        setConfirmation={setConfirmation}
        setAccepted={setAccepted}
        setPackReplies={setPackReplies}
        setCancellationReason={setCancellationReason}
        setCancellationFeedback={setCancellationFeedback}
        act={act}
      />
    </>
  )
}
export function BillingManagement({
  intent = null,
}: {
  intent?: { plan: 'starter' | 'growth'; kind: 'pack' | 'subscription' } | null
}) {
  const { data: summary, error: loadError } = useBillingSummary()
  const queryClient = useQueryClient()
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
              await queryClient.invalidateQueries({
                queryKey: ['billing-summary'],
              })
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
