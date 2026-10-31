import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { requireOrganizationPermission } from '@/lib/organization/organization-members'
import {
  captureConfigSchema,
  readCaptureConfig,
} from '@/lib/widget/capture-config'
import { leadApiError } from '@/lib/organization/lead-schemas'
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> },
) {
  try {
    const { organizationId } = await requireOrganizationPermission('configure')
    const { bot_id } = await params
    const bot = await prisma.bots.findFirst({
      where: { id: bot_id, organizationId, deletedAt: null },
      select: {
        leadCaptureConfig: true,
        updatedAt: true,
        captureName: true,
        captureEmail: true,
        capturePhone: true,
      },
    })
    if (!bot)
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    return NextResponse.json(
      {
        config: readCaptureConfig(bot.leadCaptureConfig),
        updatedAt: bot.updatedAt.toISOString(),
        fields: {
          name: !!bot.captureName,
          email: !!bot.captureEmail,
          phone: !!bot.capturePhone,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return leadApiError(error, 'Could not load capture settings')
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> },
) {
  try {
    const { organizationId } = await requireOrganizationPermission('configure')
    const { bot_id } = await params
    const body = z
      .object({ config: captureConfigSchema, updatedAt: z.iso.datetime() })
      .strict()
      .parse(await request.json())
    const updatedAt = new Date(Math.max(Date.now(), new Date(body.updatedAt).getTime() + 1))
    const changed = await prisma.bots.updateMany({
      where: {
        id: bot_id,
        organizationId,
        deletedAt: null,
        updatedAt: new Date(body.updatedAt),
      },
      data: { leadCaptureConfig: body.config, updatedAt },
    })
    if (!changed.count)
      return NextResponse.json(
        { error: 'These bot settings changed. Reload before saving.' },
        { status: 409 },
      )
    return NextResponse.json({ updatedAt: updatedAt.toISOString() })
  } catch (error) {
    return leadApiError(error, 'Could not save capture settings')
  }
}
