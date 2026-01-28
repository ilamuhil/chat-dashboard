import AuthForm from '@/components/auth/AuthForm'
import { redirect } from 'next/navigation'
import { getAuthUserIdFromCookies, getOnboardingStatus } from '@/lib/auth-server'

export default async function SignUpPage() {
  const userId = await getAuthUserIdFromCookies()
  if (userId) {
    const onboarding = await getOnboardingStatus(userId)
    redirect(onboarding.isComplete ? '/dashboard' : '/onboarding')
  }
  return <AuthForm mode='signup' />
}