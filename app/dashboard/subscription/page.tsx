import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { BillingPanel } from './BillingPanel'
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const checkoutReview:
    | { planId: 'starter' | 'growth'; kind: 'pack' | 'subscription' }
    | undefined =
    query.review === '1' &&
    (query.plan === 'starter' || query.plan === 'growth')
      ? {
          planId: query.plan,
          kind:
            query.kind === 'pack'
              ? ('pack' as const)
              : ('subscription' as const),
        }
      : undefined
  return (
    <DashboardPageHeader
      title="Subscription & usage"
      description="Choose your organization’s plan and monitor its allowance."
      contentClassName="space-y-6"
    >
      <BillingPanel checkoutReview={checkoutReview} />
    </DashboardPageHeader>
  )
}
