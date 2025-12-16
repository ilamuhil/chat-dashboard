'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const useSignout = () => {
  const router = useRouter()
  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      // Still navigate even if there's an error
    }
    router.push('/auth/login')
  }
  return { signOut }
}

export default useSignout
