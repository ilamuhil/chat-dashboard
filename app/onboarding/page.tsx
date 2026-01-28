import { redirect } from 'next/navigation'
import { getAuthUserIdFromCookies, getOnboardingStatus } from '@/lib/auth-server'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const userId = await getAuthUserIdFromCookies()
  if (!userId) redirect('/auth/login')

  const onboarding = await getOnboardingStatus(userId)
  if (onboarding.isComplete) redirect('/dashboard')

  return <OnboardingClient />
}
