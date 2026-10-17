'use client'

import { Loader2, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { BillingTaxBreakdown, type TaxQuote } from '@/components/billing-tax-breakdown'
import { billingDetailsSchema } from '@/lib/billing/details'
import { CREDIT_PACK, PLANS, money } from '@/lib/billing/catalog'
import { date } from './billing-utils'
import type { BillingAction, Confirmation, Summary } from './billing-types'

const cancellationReasons = [
  ['too_expensive', 'Too expensive'],
  ['not_using_enough', 'Not using it enough'],
  ['missing_features', 'Missing features'],
  ['technical_issues', 'Technical or reliability issues'],
  ['difficult_to_use', 'Difficult to use'],
  ['switched_provider', 'Switched to another provider'],
  ['temporary_pause', 'Temporary pause or seasonal need'],
  ['other', 'Other'],
] as const

export function BillingConfirmationDialog({
  confirmation,
  account,
  summary,
  current,
  selected,
  selectedPending,
  replacingCancelledRenewal,
  undoingPlanChange,
  replacementIsDowngrade,
  busy,
  sdkReady,
  accepted,
  packReplies,
  cancellationReason,
  cancellationFeedback,
  setConfirmation,
  setAccepted,
  setPackReplies,
  setCancellationReason,
  setCancellationFeedback,
  act,
}: {
  confirmation: Confirmation | null
  account: Summary['account']
  summary: Summary
  current: typeof PLANS.trial
  selected: TaxQuote | undefined
  selectedPending: boolean
  replacingCancelledRenewal: boolean
  undoingPlanChange: boolean
  replacementIsDowngrade: boolean
  busy: boolean
  sdkReady: boolean
  accepted: boolean
  packReplies: number
  cancellationReason: string
  cancellationFeedback: string
  setConfirmation: (value: Confirmation | null) => void
  setAccepted: (value: boolean) => void
  setPackReplies: (value: number) => void
  setCancellationReason: (value: string) => void
  setCancellationFeedback: (value: string) => void
  act: (body: BillingAction) => Promise<void>
}) {
  return (
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!busy && !open) setConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader
            className={
              confirmation?.action === 'cancel' ? 'border-b-0 pb-0' : undefined
            }
          >
            <DialogTitle>
              {confirmation?.action === 'cancel'
                ? (
                  <span className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <TriangleAlert className="size-5" />
                    Cancel future renewals?
                  </span>
                )
                : confirmation?.action === 'resume_change_plan'
                  ? `Resume renewal and switch to ${confirmation.planId ? PLANS[confirmation.planId].name : 'the selected plan'}?`
                : confirmation?.action === 'resume'
                  ? 'Resume your renewal?'
                : undoingPlanChange
                  ? `Keep your ${current.name} plan?`
                : confirmation?.action === 'change_plan'
                  ? 'Confirm your next plan'
                  : 'Review your payment'}
            </DialogTitle>
            <DialogDescription>
              {confirmation?.action === 'cancel'
                ? `Your paid access stays available until ${date(account.paidThrough)}. No further renewals will be collected.`
                : replacingCancelledRenewal
                  ? `The displayed ${confirmation?.planId ? PLANS[confirmation.planId].name : 'subscription'} amount will be charged immediately after authorization and the new monthly subscription starts after verified payment. Your previous paid access through ${date(account.paidThrough)} ends when the new subscription starts; remaining time is not prorated, refunded or credited.`
                : undoingPlanChange
                  ? `The scheduled change to ${account.pendingPlanId ? PLANS[account.pendingPlanId].name : 'the other plan'} will be cancelled. Your ${current.name} plan, allowance and renewal price will continue unchanged.`
                : confirmation?.action === 'change_plan'
                  ? 'Your current allowance stays unchanged. The new allowance starts after the next successful renewal payment.'
                  : `This purchase is for ${summary.organization.name || 'your selected organization'}. Check the total before continuing to checkout.`}
            </DialogDescription>
          </DialogHeader>
          {confirmation?.action === 'cancel' && (
            <div className="space-y-4">
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  If you later decide to renew before {date(account.paidThrough)}, the new
                  subscription will be charged immediately and a new billing
                  cycle will begin from that payment date. To preserve all paid
                  time, cancel your subscription just before the current period ends. Your previous paid access through {date(account.paidThrough)} ends when the new subscription starts; remaining time is not prorated, refunded or credited.
                </span>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="cancellation-reason"
                  className="text-sm font-medium"
                >
                  Why are you cancelling?
                </label>
                <select
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(event) =>
                    setCancellationReason(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select a reason</option>
                  {cancellationReasons.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {cancellationReason && (
                <div className="space-y-2">
                  <label
                    htmlFor="cancellation-feedback"
                    className="text-sm font-medium"
                  >
                    Additional information
                    {cancellationReason === 'other' && (
                      <span className="text-red-600"> *</span>
                    )}
                  </label>
                  <textarea
                    id="cancellation-feedback"
                    value={cancellationFeedback}
                    onChange={(event) =>
                      setCancellationFeedback(event.target.value)
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder="What can we improve, and how could we make you stay?"
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              )}
            </div>
          )}
          {selected && (
            <div className="rounded-lg bg-muted/50 p-4">
              {confirmation?.kind === 'pack' && (
                <div className="mb-4 space-y-3 border-b border-border pb-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-semibold">
                      {packReplies.toLocaleString('en-IN')} additional replies
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {money(selected.subtotalPaise)}
                    </p>
                  </div>
                  <input
                    type="range"
                    min={CREDIT_PACK.minReplies}
                    max={CREDIT_PACK.maxReplies}
                    step={CREDIT_PACK.stepReplies}
                    value={packReplies}
                    disabled={Boolean(selectedPending)}
                    onChange={(event) => {
                      setPackReplies(Number(event.target.value))
                      setAccepted(false)
                    }}
                    aria-label="Additional replies"
                    aria-valuetext={`${packReplies.toLocaleString('en-IN')} replies`}
                    className="w-full accent-sky-600 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      {CREDIT_PACK.minReplies.toLocaleString('en-IN')}
                    </span>
                    <span>
                      {CREDIT_PACK.stepReplies.toLocaleString('en-IN')}-reply
                      steps
                    </span>
                    <span>
                      {CREDIT_PACK.maxReplies.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    One-time add-on · applicable tax added below · expires 90
                    days after payment
                  </p>
                  {selectedPending && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Cancel the pending checkout to choose a different amount.
                    </p>
                  )}
                </div>
              )}
              <BillingTaxBreakdown quote={selected} />
            </div>
          )}
          {(confirmation?.action === 'checkout' ||
            replacingCancelledRenewal) &&
            !billingDetailsSchema.safeParse(account.billingDetails).success && (
              <Link
                className="text-sm text-sky-700 underline"
                href={`/dashboard/billing?plan=${confirmation?.planId}&kind=${confirmation?.kind || 'subscription'}`}
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
                {replacingCancelledRenewal
                  ? `I understand that the displayed amount is charged immediately, the new subscription begins after verified payment, and remaining time on my previous subscription is not prorated, refunded or credited.`
                  : undoingPlanChange
                    ? `I understand that the scheduled plan change will be removed and my ${current.name} subscription will continue renewing at the displayed amount.`
                  : confirmation?.kind === 'pack'
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
                (confirmation?.action === 'cancel' &&
                  (!cancellationReason ||
                    (cancellationReason === 'other' &&
                      !cancellationFeedback.trim()))) ||
                ((confirmation?.action === 'checkout' ||
                  replacingCancelledRenewal) &&
                  !sdkReady) ||
                ((confirmation?.action === 'checkout' ||
                  replacingCancelledRenewal) &&
                  !billingDetailsSchema.safeParse(account.billingDetails)
                    .success) ||
                (confirmation?.action !== 'cancel' &&
                  (!accepted ||
                    Boolean(selected?.taxPaise && !selected.taxBreakdown)))
              }
              onClick={() => {
                if (!confirmation) return
                void act(
                  confirmation.action === 'cancel'
                    ? {
                        ...confirmation,
                        reason: cancellationReason,
                        feedback: cancellationFeedback.trim() || undefined,
                      }
                    : confirmation.action === 'checkout' &&
                        confirmation.kind === 'pack'
                      ? { ...confirmation, packReplies }
                    : confirmation,
                )
              }}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {(confirmation?.action === 'checkout' ||
                replacingCancelledRenewal) &&
              !sdkReady
                ? 'Loading secure checkout…'
                : confirmation?.action === 'cancel'
                ? 'Cancel renewal'
                  : confirmation?.action === 'resume_change_plan'
                    ? replacementIsDowngrade
                      ? 'Pay now & downgrade'
                      : 'Pay now & upgrade'
                    : confirmation?.action === 'resume'
                      ? 'Pay now & renew'
                : confirmation?.action === 'change_plan'
                  ? undoingPlanChange
                    ? `Keep ${current.name}`
                    : 'Schedule change'
                  : 'Continue to checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
