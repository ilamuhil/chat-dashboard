import { Button } from '@/components/ui/button'
import { Check, CreditCardIcon, SparklesIcon } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

type Plan = {
  id: 'base' | 'pro' | 'enterprise'
  name: string
  priceLabel: string
  description: string
  limits: {
    aiUsage: string
    orgUsers: string
    storage: string
    leads: string
    conversations: string
  }
}

// Sample data for now. Later: fetch selected plan + limits from DB.
const PLANS: Plan[] = [
  {
    id: 'base',
    name: 'Base',
    priceLabel: '₹2,999',
    description: 'For small teams running live bots.',
    limits: {
      aiUsage: '5,000 AI messages / month',
      orgUsers: '3 users in org',
      storage: '5 GB storage',
      leads: '500 leads / month',
      conversations: '1,000 conversations / month',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceLabel: '₹4,999',
    description: 'Scale usage across more channels.',
    limits: {
      aiUsage: '50,000 AI messages / month',
      orgUsers: '10 users in org',
      storage: '25 GB storage',
      leads: '2,000 leads / month',
      conversations: '5,000 conversations / month',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Custom',
    description: 'Tailored limits and dedicated support.',
    limits: {
      aiUsage: 'Unlimited AI messages',
      orgUsers: 'Unlimited users in org',
      storage: 'Custom storage (starts at 100 GB)',
      leads: 'Custom lead limits',
      conversations: 'Custom conversation limits',
    },
  },
]

export default function SubscriptionPage() {
  // Sample current plan. Later: read from DB.
  const currentPlanId: Plan['id'] = 'base'
  const currentPlanIndex = PLANS.findIndex(p => p.id === currentPlanId)
  const currentPlan = PLANS[currentPlanIndex] ?? PLANS[0]
  const nextBillingDate = new Date('2026-09-01T00:00:00')

  return (
    <DashboardPageHeader
      title='Subscription'
      description='Review your current plan and choose the right tier for your team.'
      contentClassName='space-y-6'>
      {/* Current plan summary */}
      <section className='dashboard-surface overflow-hidden rounded-xl p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
              <CreditCardIcon className='size-4' />
            </div>
            <div className='min-w-0 space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold tracking-tight text-foreground'>
                  Current plan
                </h2>
                <span className='rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800'>
                  {currentPlan.name}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                Next billing{' '}
                <span className='font-medium text-foreground'>
                  {format(nextBillingDate, 'dd MMM yyyy')}
                </span>
                <span className='text-muted-foreground'>
                  {' '}
                  ({formatDistanceToNow(nextBillingDate, { addSuffix: true })})
                </span>
              </p>
            </div>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-9 shrink-0 rounded-lg border-rose-200 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700'>
            Cancel Subscription
          </Button>
        </div>

        <ul className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {[
            currentPlan.limits.aiUsage,
            currentPlan.limits.orgUsers,
            currentPlan.limits.storage,
            currentPlan.limits.leads,
            currentPlan.limits.conversations,
          ].map(feature => (
            <li
              key={feature}
              className='flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2.5 text-xs text-slate-700 shadow-sm'>
              <Check className='mt-0.5 size-3.5 shrink-0 text-emerald-600' />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Plans */}
      <section className='space-y-4'>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold tracking-tight text-foreground'>
            Choose your plan
          </h2>
          <p className='text-xs text-muted-foreground'>
            Upgrade or downgrade anytime. Limits apply per billing cycle.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {PLANS.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId
            const isDowngrade = index < currentPlanIndex
            const isPopular = plan.id === 'pro'
            const buttonText = isCurrent
              ? 'Current Plan'
              : isDowngrade
                ? 'Downgrade'
                : plan.id === 'enterprise'
                  ? 'Contact Sales'
                  : 'Upgrade'

            return (
              <article
                key={plan.id}
                className={cn(
                  'dashboard-surface relative flex h-full flex-col overflow-hidden rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm',
                  isCurrent
                    ? 'border-emerald-200 bg-linear-to-br from-emerald-50/80 via-white to-sky-50/40 ring-1 ring-emerald-200/60'
                    : 'hover:border-sky-200',
                  isPopular && !isCurrent && 'border-sky-200'
                )}>
                {isPopular && (
                  <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/70 to-transparent' />
                )}

                <div className='mb-4 flex items-start justify-between gap-2'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h3 className='text-sm font-semibold text-foreground'>
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <span className='rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700'>
                          Active
                        </span>
                      )}
                      {isPopular && !isCurrent && (
                        <span className='inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700'>
                          <SparklesIcon className='size-3' />
                          Popular
                        </span>
                      )}
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className='mb-4'>
                  <div className='flex items-baseline gap-1'>
                    <span className='text-2xl font-semibold tracking-tight text-foreground'>
                      {plan.priceLabel}
                    </span>
                    {plan.id !== 'enterprise' && (
                      <span className='text-xs text-muted-foreground'>/ mo</span>
                    )}
                  </div>
                </div>

                <ul className='mb-5 flex-1 space-y-2.5'>
                  {[
                    plan.limits.aiUsage,
                    plan.limits.orgUsers,
                    plan.limits.storage,
                    plan.limits.leads,
                    plan.limits.conversations,
                  ].map(feature => (
                    <li key={feature} className='flex items-start gap-2'>
                      <span className='mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
                        <Check className='size-2.5' />
                      </span>
                      <span className='text-xs leading-relaxed text-slate-600'>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  type='button'
                  variant={isCurrent ? 'default' : 'outline'}
                  size='sm'
                  disabled={isCurrent}
                  className={cn(
                    'h-9 w-full rounded-lg text-xs font-medium shadow-sm',
                    isCurrent &&
                      'bg-emerald-600 hover:bg-emerald-600 disabled:opacity-100',
                    !isCurrent &&
                      !isDowngrade &&
                      'border-slate-200 bg-linear-to-r from-slate-800 to-sky-800 text-white hover:from-slate-900 hover:to-sky-900 hover:text-white',
                    isDowngrade && 'border-slate-200'
                  )}>
                  {buttonText}
                </Button>
              </article>
            )
          })}
        </div>
      </section>
    </DashboardPageHeader>
  )
}
