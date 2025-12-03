"use client"

import supabase from '@/lib/supabase'
import { redirect } from 'next/navigation'

const page = () => {
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error(error)
    }
    else {
      redirect('/auth/login')
    }
  }
  return (
    <div className='flex items-center justify-center h-dvh bg-background'>
      <button onClick={signOut} className='bg-red-500 text-white p-2 rounded-md'>Sign out</button>
    </div>
  )
}

export default page