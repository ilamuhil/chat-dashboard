import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { fileExists } from '@/lib/filemanagement'

const BUCKET = 'bot-files'

export async function POST(request: NextRequest) {
  const { bot_id, source_ids } = (await request.json()) as {
    bot_id: string
    source_ids: string[]
  }
  if (
    !bot_id ||
    !source_ids ||
    !Array.isArray(source_ids) ||
    source_ids.length === 0
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const auth = await requireUserOrgAndBot(request, bot_id)
  if (!auth?.userId || !auth?.organizationId || !auth?.botId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const trainingSources = await prisma.trainingSources.findMany({
      where: {
        id: { in: source_ids },
        botId: auth.botId,
        organizationId: auth.organizationId,
        type: 'file',
        status: 'pending',
      },
    })

    if (trainingSources.length === 0) {
      return NextResponse.json(
        { message: 'No new files to verify/upload',verifiedSourceIds: [], unverifiedSourceIds: [] },
        { status: 200 }
      )
    }

    //check if files are in storage
    const filesDataPromises = trainingSources.map(source => {
      if (!source.sourceValue) {
        return Promise.resolve(false)
      }
      return fileExists(BUCKET, source.sourceValue).catch(err => {
        console.error('Storage error', err)
        throw err // bubble up, fail finalize
      })
    })

    const filesData = await Promise.all(filesDataPromises)
    const tsToBeUpdated = trainingSources.filter(
      (source, index) => filesData[index] === true
    )
    const tsIdsToBeUpdated = tsToBeUpdated.map(s => s.id)

    //deal with
    await prisma.$transaction(async tx => {
      await tx.trainingSources.updateMany({
        where: {
          id: { in: tsIdsToBeUpdated },
          status: 'pending',
        },
        data: {
          status: 'created',
        },
      })
      await tx.files.createMany({
        skipDuplicates: true,
        data: tsToBeUpdated.map(s => ({
          organizationId: auth.organizationId,
          botId: auth.botId,
          bucket: BUCKET,
          path: s.sourceValue,
          originalFilename: s.originalFilename,
          mimeType: s.mimeType,
          sizeBytes: s.sizeBytes,
        })),
      })
    })
    const responsePayload = {
      message: 'Training sources validated',
      allSourcesVerified: trainingSources.length === tsToBeUpdated.length,
      verifiedSourceIds: tsIdsToBeUpdated,
      unverifiedSourceIds: trainingSources
        .filter(s => !tsIdsToBeUpdated.includes(s.id))
        .map(s => s.id),
    }
    return NextResponse.json(responsePayload, { status: 200 })
  } catch (e: unknown) {
    console.error('Error', e)
    return NextResponse.json(
      { error: 'Failed to verify/uploaded files' },
      { status: 500 }
    )
  }
}
