'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getSecretKey, signToken } from '@/lib/jwt'

type AuthResult = {
  error?: string | Record<string, string[]>
  success?: string
}

export type AgentJwtResult =
  | { status: number; error: string }
  | {
      status: 200
      token: string
      conversation_id: string
      bot_id: number
      organization_id: string
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
  const { error } = await supabase.auth.signUp({
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


const getAgentJwt = async (conversation_id: string): Promise<AgentJwtResult> => {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return {error: 'Unauthorized/User not found', status: 401 }
  }

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations_meta')
    .select('id, bot_id, organization_id')
    .eq('id', conversation_id)
    .maybeSingle()

  if (conversationError || !conversation) {
    console.error(
      'Failed to authenticate agent. Conversation not found.',
      conversationError
    )
    return { error: 'Conversation not found', status: 404 }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', conversation.organization_id)
    .maybeSingle()

  if (membershipError || !membership) {
    console.error(
      'Failed to authenticate agent. Unauthorized. User not found in organization members table for this conversation org.',
      membershipError
    )
    return { error: 'Unauthorized', status: 401 }
  }

  const privateKey = getSecretKey()
  if (!privateKey) {
    return { error: 'Failed to create token', status: 500 }
  }

  const token = signToken(
    {
      organization_id: conversation.organization_id,
      bot_id: conversation.bot_id,
      conversation_id: conversation.id,
      type: 'agent',
    },
    privateKey
  )

  return {
    token,
    conversation_id: conversation.id,
    bot_id: conversation.bot_id,
    organization_id: conversation.organization_id,
    status: 200,
  }
}

export { signup, login, getAgentJwt }
