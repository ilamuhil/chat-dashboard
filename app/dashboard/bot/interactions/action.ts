"use server"

import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

type BotResult = {
  error?: string | Record<string, string[]>
  success?: string
}

const botMetSchema = z.object({
  name: z.string().min(3, 'Bot name must be at least 3 characters').max(50),
  tone: z.enum(['friendly', 'professional', 'enthusiastic', 'casual', 'concise', 'empathetic', 'humorous', 'authoritative', 'formal', 'neutral']),
  role: z.enum(['customer-support', 'sales', 'marketing', 'technical-support', 'other']),
  firstMessage: z.string().min(3).max(500),
  leadCaptureMessage: z.string().optional(),
  confirmationMessage: z.string().optional(),
  businessDescription: z.string().min(3).max(1000),
  leadCapture: z.string().transform(val => val === 'on' || val === 'true'),
  leadCaptureTiming: z.enum(['before-conversation', 'after-first-message']).optional(),
  captureName: z.string().transform(val => val === 'on' || val === 'true').optional(),
  captureEmail: z.string().transform(val => val === 'on' || val === 'true').optional(),
  capturePhone: z.string().transform(val => val === 'on' || val === 'true').optional(),
})

export async function updateBotInteractions(
  prevState: BotResult | null,
  formData: FormData
): Promise<BotResult> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'You must be logged in to update bot configuration' }
  }

  // Get user's organization
  const { data: organizationMember, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (orgError || !organizationMember) {
    return { error: 'You must belong to an organization to create a bot' }
  }

  const validatedFields = botMetSchema.safeParse({
    name: formData.get('name'),
    tone: formData.get('tone'),
    role: formData.get('role'),
    firstMessage: formData.get('firstMessage'),
    leadCaptureMessage: formData.get('leadCaptureMessage') || '',
    confirmationMessage: formData.get('confirmationMessage') || '',
    businessDescription: formData.get('businessDescription'),
    leadCapture: formData.get('leadCapture'),
    leadCaptureTiming: formData.get('leadCaptureTiming'),
    captureName: formData.get('captureName'),
    captureEmail: formData.get('captureEmail'),
    capturePhone: formData.get('capturePhone'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }

  const data = validatedFields.data

  // Map form values to database column names
  // leadCaptureTiming: 'before-conversation' -> 'start', 'after-first-message' -> 'after_first'
  const leadCaptureTimingDb = data.leadCaptureTiming === 'before-conversation' 
    ? 'start' 
    : data.leadCaptureTiming === 'after-first-message' 
      ? 'after_first' 
      : null

  // Check if bot already exists for this organization
  const { data: existingBot } = await supabase
    .from('bots')
    .select('id')
    .eq('organization_id', organizationMember.organization_id)
    .maybeSingle()

  const botData = {
    organization_id: organizationMember.organization_id,
    name: data.name,
    tone: data.tone,
    role: data.role,
    business_description: data.businessDescription,
    first_message: data.firstMessage,
    confirmation_message: data.confirmationMessage || null,
    lead_capture_message: data.leadCaptureMessage || null,
    capture_leads: data.leadCapture,
    lead_capture_timing: leadCaptureTimingDb,
    capture_name: data.captureName || false,
    capture_email: data.captureEmail || false,
    capture_phone: data.capturePhone || false,
    updated_at: new Date().toISOString(),
  }

  if (existingBot) {
    // Update existing bot
    const { error: updateError } = await supabase
      .from('bots')
      .update(botData)
      .eq('id', existingBot.id)

    if (updateError) {
      console.error('Bot update error:', updateError)
      return { error: updateError.message }
    }

    return { success: 'Bot configuration updated successfully' }
  } else {
    // Create new bot
    const { error: insertError } = await supabase
      .from('bots')
      .insert(botData)

    if (insertError) {
      console.error('Bot creation error:', insertError)
      return { error: insertError.message }
    }

    return { success: 'Bot configuration saved successfully' }
  }
}