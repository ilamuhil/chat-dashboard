import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { BillingManagement } from '../subscription/BillingPanel'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const intent: {
    plan: 'starter' | 'growth'
    kind: 'pack' | 'subscription'
  } | null =
    query.plan === 'starter' || query.plan === 'growth'
      ? {
          plan: query.plan,
          kind:
            query.kind === 'pack'
              ? ('pack' as const)
              : ('subscription' as const),
        }
      : null
  return (
    <DashboardPageHeader
      title="Billing & invoices"
      description="Manage billing details, payments and downloadable invoices."
      contentClassName="space-y-6"
    >
      <BillingManagement intent={intent} />
    </DashboardPageHeader>
  )
}
