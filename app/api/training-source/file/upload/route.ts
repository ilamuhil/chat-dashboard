import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/auth-server'
import { uploadFile, getPresignedUrl } from '@/lib/filemanagement'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

const BUCKET = 'bot-files'
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB

async function createContentHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return createHash('sha256').update(buffer).digest('hex')
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  const botId = formData.get('bot_id')?.toString()
  const files = formData.getAll('files') as File[]

  if (!botId || !files || files.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const auth = await requireUserOrgAndBot(request, botId)
  if (!auth?.organizationId || !auth?.botId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // size guard
  for (const file of files) {
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }
  }

  // compute hashes
  let uploadItems: { file: File; hash: string }[]
  try {
    const hashes = await Promise.all(files.map(createContentHash))
    uploadItems = files.map((file, i) => ({
      file,
      hash: hashes[i],
    }))
  } catch (err) {
    console.error('Hashing failed', err)
    return NextResponse.json({ error: 'Hashing failed' }, { status: 500 })
  }

  // check existing training sources
  const existingSources = await prisma.trainingSources.findMany({
    where: {
      organizationId: auth.organizationId,
      botId: auth.botId,
      type: 'file',
      contentHash: { in: uploadItems.map(i => i.hash) },
    },
    select: { id: true, contentHash: true },
  })

  const existingHashSet = new Set(existingSources.map(s => s.contentHash))

  const newUploadItems = uploadItems.filter(
    item => !existingHashSet.has(item.hash)
  )

  // nothing new to upload
  if (newUploadItems.length === 0) {
    return NextResponse.json(
      { trainingSourceIds: existingSources.map(s => s.id) },
      { status: 200 }
    )
  }

  // create training_sources (intent only)
  let newSources
  try {
    newSources = await prisma.trainingSources.createManyAndReturn({
      data: newUploadItems.map(item => ({
        organizationId: auth.organizationId,
        botId: auth.botId,
        type: 'file',
        status: 'pending',
        contentHash: item.hash,
        sourceValue: `organizations/${auth.organizationId}/bots/${auth.botId}/${item.hash}`,
      })),
      select: { id: true, contentHash: true },
    })
  } catch (err) {
    // handle race via unique constraint
    const fallback = await prisma.trainingSources.findMany({
      where: {
        organizationId: auth.organizationId,
        botId: auth.botId,
        type: 'file',
        contentHash: { in: newUploadItems.map(i => i.hash) },
      },
      select: { id: true },
    })

    return NextResponse.json(
      { trainingSourceIds: [...existingSources.map(s => s.id), ...fallback.map(f => f.id)] },
      { status: 200 }
    )
  }

  // generate presigned URLs
  const presignedUrls = await Promise.all(
    newUploadItems.map(item =>
      getPresignedUrl({
        method: 'PUT',
        bucket: BUCKET,
        key: `organizations/${auth.organizationId}/bots/${auth.botId}/${item.hash}`,
        expiresInSeconds: 900,
      })
    )
  )

  // fire-and-forget uploads
  presignedUrls.forEach((url, i) => {
    uploadFile(newUploadItems[i].file, url, BUCKET)
  })

  return NextResponse.json(
    {
      trainingSourceIds: [
        ...existingSources.map(s => s.id),
        ...newSources.map(s => s.id),
      ],
    },
    { status: 200 }
  )
}
