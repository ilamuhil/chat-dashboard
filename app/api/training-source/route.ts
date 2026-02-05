import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { prisma } from '@/lib/prisma'
import { getSecretKey, signToken } from '@/lib/jwt'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { deleteFile, fileExists } from '@/lib/filemanagement'

const BUCKET = 'bot-files'
// source status is created or pending (No training performed on resource) -> file type -> remove file from storage and delete transaction records, file records from db. url type -> delete transaction record from db.

//TODO: trained resource deletion flow yet to be implemented.

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
  const { organizationId } = guard

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
  


  // Pre training source deletion logic

  if (source.type === 'url') { 
    if (source.status === 'created' || source.status === 'pending') { 
      try {
      await prisma.trainingSources.delete({
        where: {
            id: source.id,
          }
        })
        return NextResponse.json({ message: 'URL deleted successfully' }, { status: 200 })
      } catch (err: unknown) {
        console.error('URL deletion failed', err)
        return NextResponse.json({ error: 'URL deletion failed' }, { status: 500 })
      }
    }
  }

  if (source.type === 'file') {
    const deletionPath = source.sourceValue!
    try {
      if (source.status === 'created' || source.status === 'pending') {
        await prisma.$transaction(async tx => {
          await tx.files.deleteMany({
            where: {
              path: deletionPath,
              botId: bot_id,
              organizationId: organizationId,
            },
          })

          await tx.trainingSources.delete({
            where: {
              id: source.id,
            },
          })
        })
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

  if (source.status === 'processing') {
    return NextResponse.json(
      { error: 'Cannot delete while processing' },
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
    { organization_id: organizationId, bot_id, type: 'agent' },
    privateKey,
    '5m'
  )

  try {
    await pythonApiRequest('POST', '/api/training/source/delete', token, {
      source_id,
    })
    await prisma.trainingSources.deleteMany({
      where: { id: source_id, botId: bot_id },
    })
    await prisma.files.deleteMany({
      where: { id: source_id, botId: bot_id },
    })
    return NextResponse.json({ message: 'Deleted' }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
