'use client'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
export function BillingStatus() {
  const pathname = usePathname()
  const { data } = useQuery<{ active: boolean; status: string; used: number; limit: number; extra: number }>({ queryKey: ['billing-status', pathname], enabled: !pathname.startsWith('/dashboard/subscription'), queryFn: async () => { const response = await fetch('/api/billing/usage', { cache: 'no-store' }); if (!response.ok) throw new Error('Usage unavailable'); return response.json() }, staleTime: 30000, refetchInterval: 60000, retry: 1 })
  if (!data || pathname.startsWith('/dashboard/subscription')) return null
  const message = !data.active ? 'Your plan has ended. AI replies are paused; contact capture and human handoff stay available.' : data.status === 'past_due' ? 'Your renewal needs attention. Review the payment and grace period in Billing.' : data.used >= data.limit && data.extra <= 0 ? 'Your AI replies are used up. Contact capture and human handoff stay available.' : data.limit > 0 && data.used / data.limit >= 0.8 ? `${data.used.toLocaleString('en-IN')} of ${data.limit.toLocaleString('en-IN')} included AI replies used this cycle.` : null
  if (!message) return null
  return <div role="status" className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"><span>{message}</span><Link href="/dashboard/subscription" className="font-medium underline underline-offset-2">Billing & usage</Link></div>
}
