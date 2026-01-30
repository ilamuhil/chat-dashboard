import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/auth-server'
import { uploadFile, getPresignedUrl } from '@/lib/filemanagement'
import { prisma } from '@/lib/prisma'


const BUCKET = 'bot-files'



export async function POST(request: NextRequest) { 
  const formData = await request.formData()

  // data validation and api authorization

  const bot_id = formData.get('bot_id')?.toString()
  const files = formData.getAll('files') as File[] | null
  if (!bot_id || !files || files.length === 0) { 
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const auth = await requireUserOrgAndBot(request, bot_id)
  if (!auth?.userId || !auth?.organizationId || !auth?.botId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // upload Flow Begin

  //TODO: Create content hash of the file buffer
  

  const presignedUrls = files.map(file => getPresignedUrl({
    method: 'PUT',
    bucket: BUCKET,
    key: `organizations/${auth.organizationId}/bots/${auth.botId}/${file.name}`,
    expiresInSeconds: 60 * 15
  }))

  try {
    const trainingSources = await prisma.trainingSources.createManyAndReturn({
      data: files.map((file, index) => ({
        organizationId: auth.organizationId,
        botId: auth.botId,
        type: 'file',
        sourceValue: file.name,
        status: 'PENDING',
      })),
      select: { id: true },
    })
  } catch (e: unknown) {
    console.error('Error getting presigned URLs:', e)
  }

  



  


  // upload files to r2
  
}