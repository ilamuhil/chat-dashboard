'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

type AuthResult = {
  error?: string | Record<string, string[]>
  success?: string
}

const authSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  fullname: z.string().min(1, { message: 'Full name is required' }),
  phone: z.string().optional(),
})

const signup = async (
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> => {
  const validatedFields = authSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullname: formData.get('fullname'),
    phone: formData.get('phone'),
  })
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }
  const { email, password, fullname, phone } = validatedFields.data
  
  const supabase = await createClient(true)
  
  // Sign up the user - store fullname and phone in user metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        fullname,
        phone: phone || null,
      },
    },
  })
  if (error) {
    console.error(error)
    return { error: error.message }
  }
  
  return { success: 'Please check your email for a verification link' }
}

const login = async (
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> => {
  const loginSchema = authSchema.pick({ email: true, password: true })
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }
  const { email, password } = validatedFields.data
  
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    console.error(error)
    return { error: error.message }
  }
  
  if (data?.user) {
    // Check if profile exists, if not create it (for email confirmation case)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()
    
    if (!existingProfile) {
      // Profile doesn't exist - create it using metadata from signup
      const fullname = data.user.user_metadata?.fullname || ''
      const phone = data.user.user_metadata?.phone || null
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullname,
          phone: phone,
        })
      
      if (profileError) {
        console.error('Profile creation failed on login:', profileError)
        // Don't block login if profile creation fails
      }
    }
    
    redirect('/dashboard')
  }
  
  return { error: 'Login failed' }
}

export { signup, login }
