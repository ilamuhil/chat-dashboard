'use client'

import { useRouter } from 'next/navigation'

const useSignout = () => {
  const router = useRouter()
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    try {
      window.localStorage.removeItem('auth_token')
    } catch {
      // ignore
    }
    router.push('/auth/login')
  }
  return { signOut }
}

export default useSignout
