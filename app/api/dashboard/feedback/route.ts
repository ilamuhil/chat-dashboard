import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { sendFeedbackEmail } from '@/lib/email'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_TOTAL_SIZE = 20 * 1024 * 1024
const MAX_FILES = 8

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const organizationId = await resolveCurrentOrganizationId({ userId })
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const message = String(formData.get('message') ?? '').trim()
    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!message) {
      return NextResponse.json(
        { error: 'Please enter your feedback.' },
        { status: 400 },
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can attach up to ${MAX_FILES} images.` },
        { status: 400 },
      )
    }

    const totalSize = files.reduce((total, file) => total + file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE || files.some(file => file.size > MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: 'Each image must be under 8 MB and attachments must total under 20 MB.' },
        { status: 400 },
      )
    }

    if (files.some(file => !file.type.startsWith('image/'))) {
      return NextResponse.json(
        { error: 'Only image attachments are supported.' },
        { status: 400 },
      )
    }

    const [user, organization] = await Promise.all([
      prisma.users.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      }),
      prisma.organizations.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
    ])

    if (!user?.email || !organization) {
      return NextResponse.json(
        { error: 'Could not identify your dashboard account.' },
        { status: 400 },
      )
    }

    const attachments = await Promise.all(
      files.map(async file => ({
        filename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120),
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
      })),
    )

    await sendFeedbackEmail({
      message: message.slice(0, 10_000),
      userName: user.fullName || 'Dashboard user',
      userEmail: user.email,
      userId,
      organizationName: organization.name || 'Organization',
      sourceUrl: request.headers.get('referer') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      attachments,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to send dashboard feedback:', error)
    return NextResponse.json(
      { error: 'Feedback could not be sent right now. Please try again.' },
      { status: 500 },
    )
  }
}
