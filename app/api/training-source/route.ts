import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { prisma } from '@/lib/prisma'
import { getSecretKey, signToken } from '@/lib/jwt'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { deleteFile, fileExists } from '@/lib/filemanagement'
import { isAxiosError } from 'axios'

const BUCKET = 'bot-files'
// source status is created or pending (No training performed on resource) -> file type -> remove file from storage and delete transaction records, file records from db. url type -> delete transaction record from db.

export async function DELETE(request: NextRequest) {
  // Authorization complete
  const { source_id, bot_id } = (await request.json()) as {
    source_id: string
    bot_id: string
  }

  if (!bot_id || !source_id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  //Authorization check
  console.log('Authorization completed')
  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const { organizationId, userId } = guard

  const source = await prisma.trainingSources.findFirst({
    where: { id: source_id, botId: bot_id, organizationId },
  })

  if (!source) {
    console.log('Source not found')
    return NextResponse.json(
      { error: 'File not found or already deleted' },
      { status: 200 }
    )
  }

  const isFile = source.type === 'file'



  // Pre training source deletion logic

  if (!isFile) {
    if (!source.deletedAt && (source.status === 'created' || source.status === 'pending')) {
      try {
        const removed = await prisma.trainingSources.deleteMany({
          where: {
            id: source.id, botId: bot_id, organizationId, deletedAt: null,
            status: { in: ['created', 'pending'] },
          },
        })
        if (removed.count === 0) {
          return NextResponse.json({ error: 'Source changed. Refresh and retry.' }, { status: 409 })
        }
        return NextResponse.json({ message: 'URL deleted successfully' }, { status: 200 })
      } catch (err: unknown) {
        console.error('URL deletion failed', err)
        return NextResponse.json({ error: 'URL deletion failed' }, { status: 500 })
      }
    }
  }

  if (isFile) {
    const deletionPath = source.sourceValue!
    try {
      if (!source.deletedAt && (source.status === 'created' || source.status === 'pending')) {
        const removed = await prisma.$transaction(async tx => {
          const result = await tx.trainingSources.deleteMany({
            where: {
              id: source.id, botId: bot_id, organizationId, deletedAt: null,
              status: { in: ['created', 'pending'] },
            },
          })
          if (result.count === 0) return false
          await tx.files.deleteMany({
            where: {
              path: deletionPath,
              botId: bot_id,
              organizationId: organizationId,
            },
          })

          return true
        })
        if (!removed) {
          return NextResponse.json({ error: 'Source changed. Refresh and retry.' }, { status: 409 })
        }
        console.log('transaction successful')
        //delete file from storage
        try {
          const isFile = await fileExists(BUCKET, deletionPath)
          if (isFile) {
            await deleteFile(BUCKET, deletionPath)
            console.log('file deleted from storage')
          }
        } catch (err: unknown) {
          console.error('File deletion failed', err)
          return NextResponse.json(
            { error: 'File deletion failed' },
            { status: 500 }
          )
        }
        return NextResponse.json(
          { message: 'File deleted successfully' },
          { status: 200 }
        )
      }
    } catch (err: unknown) {
      console.error('File deletion failed', err)
      return NextResponse.json(
        { error: 'File deletion failed' },
        { status: 500 }
      )
    }
  }

  // post training source deletion logic

  if (["processing","queued_for_training","training"].includes(source.status || '')) {
    return NextResponse.json(
      { error: 'Cannot delete source. Please wait for the training/processing to complete.' },
      { status: 409 }
    )
  }

  const privateKey = getSecretKey()
  if (!privateKey) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  const token = signToken(
    { organization_id: organizationId, bot_id, type: 'support_agent', sub: userId },
    privateKey,
    '5m'
  )

  try {
    // The chat API disables retrieval before committing the deletion metadata.
    const result = await pythonApiRequest<{ message: string; job_id: string }>(
      'DELETE', `/api/training/delete/${source_id}`, token,
    )
    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      return NextResponse.json({ error: error.response?.data?.error || 'Delete failed. If this issue persists, please contact support.' }, { status: error.response?.status ?? 500 })
    }
    console.error('Deletion failed', error)
    return NextResponse.json({ error: 'Deletion failed. If this issue persists, please contact support.' }, { status: 500 })
  }
}
