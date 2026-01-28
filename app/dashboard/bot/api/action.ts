'use server'

import { ApiKeyResult } from './types'
import { revalidatePath } from 'next/cache'
import { createApiKey, hashApiKey } from '@/lib/utils'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function saveApiKey(
  prevState: ApiKeyResult | null,
  formData: FormData
): Promise<ApiKeyResult> {
  const api_key_label = formData.get('api_key_label')
  if (!api_key_label) {
    return {
      error: 'Please enter a label for the API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  const botIdRaw = formData.get('bot_id')
  const bot_id = typeof botIdRaw === 'string' ? botIdRaw : null
  if (!bot_id) {
    return {
      error: 'Please select a bot to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }
  const userId = await requireAuthUserId()

  const organizationId = await resolveCurrentOrganizationId({ userId })
  if (!organizationId) {
    return {
      error: 'You must belong to an organization to generate an API key',
      success: null,
      apiKey: null,
      nonce: Date.now().toString(),
    }
  }

  // Verify the bot belongs to the organization
  const bot = await prisma.bots.findFirst({
    where: { id: bot_id, organizationId },
    select: { id: true },
  })
  if (!bot) {
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

  try {
    await prisma.apiKeys.create({
      data: {
        organizationId,
        botId: bot.id,
        name: api_key_label.toString(),
        keyHash: hashedApiKey,
        isActive: true,
      },
    })
  } catch (e) {
    console.error('Error generating API key:', e)
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

export async function revokeApiKey(formData: FormData): Promise<void> {
  const userId = await requireAuthUserId()
  const id = formData.get('api_key_id')
  if (!id) {
    console.error('No API key ID provided')
    return
  }
  const apiKey = await prisma.apiKeys.findUnique({
    where: { id: id.toString() },
    select: { id: true, organizationId: true },
  })
  if (!apiKey?.organizationId) return

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId, organizationId: apiKey.organizationId },
    select: { id: true },
  })
  if (!membership) return

  await prisma.apiKeys.update({
    where: { id: apiKey.id },
    data: { isActive: false },
  })
  revalidatePath('/dashboard/bot/api')
  return
}
