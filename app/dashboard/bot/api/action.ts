'use server'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'
import { ApiKeyResult } from './types'
import { revalidatePath } from 'next/cache'

export async function saveApiKey(
  prevState: ApiKeyResult | null,
  formData: FormData
): Promise<ApiKeyResult> {
  const supabase = await createClient()
  const api_key_label = formData.get('api_key_label')
  if (!api_key_label) {
    return {
      error: 'Please enter a label for the API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  const bot_id = formData.get('bot_id')
  if (!bot_id) {
    return {
      error: 'Please select a bot to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return {
      error: 'You must be logged in to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  const { data: organizationMember, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (orgError || !organizationMember) {
    return {
      error: 'You must belong to an organization to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }

  // Verify the bot belongs to the organization
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id')
    .eq('id', bot_id.toString())
    .eq('organization_id', organizationMember.organization_id)
    .single()
  if (botError || !bot) {
    return {
      error:
        'Please select a valid bot or create a bot first to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }

  const apiKey = createApiKey()
  const hashedApiKey = hashApiKey(apiKey)

  const { error: apiKeyError } = await supabase.from('api_keys').insert({
    organization_id: organizationMember.organization_id,
    bot_id: bot.id,
    name: api_key_label.toString(),
    key_hash: hashedApiKey,
    is_active: true,
  })
  if (apiKeyError) {
    console.error('Error generating API key:', apiKeyError)
    return {
      error: 'Failed to generate API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  revalidatePath('/dashboard/bot/api')
  return {
    success: 'API key generated successfully',
    apiKey: apiKey,
    error: null,
    nonce: Date.now().toString(),
  }
}

export async function revokeApiKey(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('api_key_id')
  if (!id) {
    console.error('No API key ID provided')
    return { error: 'Invalid Operation' }
  }
  const { error: apiKeyError } = await supabase
    .from('api_keys')
    .update({
      is_active: false,
    })
    .eq('id', id)
  if (apiKeyError) {
    console.error('Error revoking API key:', apiKeyError)
    return {
      error: 'Failed to revoke API key',
      nonce: Date.now().toString(),
      success: null,
    }
  }
  revalidatePath('/dashboard/bot/api')
  return {
    success: 'API key revoked successfully',
    nonce: Date.now().toString(),
    error: null,
  }
}

function createApiKey(): string {
  // Short, still cryptographically-random (nanoid uses WebCrypto/crypto)
  // Example: bot_V1StGXR8_Z5jdHi6B-myT
  return `bot_${nanoid(24)}`
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}
