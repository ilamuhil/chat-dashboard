'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
export function BillingIntent() {
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    const plan = document.cookie
      .split('; ')
      .find((item) => item.startsWith('billing_intent='))
      ?.split('=')[1]
    if (plan && ['trial', 'starter', 'growth'].includes(plan)) {
      document.cookie = 'billing_intent=; path=/; max-age=0; SameSite=Lax'
      if (pathname !== '/dashboard/subscription')
        router.replace(`/dashboard/subscription?plan=${plan}`)
    }
  }, [pathname, router])
  return null
}
