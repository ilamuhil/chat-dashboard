import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserOrgAndBot } from '@/lib/auth-server'
export async function POST(request: NextRequest) { 
  const { bot_id, url } = await request.json()
  if (!bot_id || !url || typeof url !== 'string') { 
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const urlregex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  if (!urlregex.test(url)) { 
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  } 
  const auth = await requireUserOrgAndBot(request, bot_id)
  if (!auth?.userId || !auth?.organizationId || !auth?.botId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const source = await prisma.trainingSources.create({
      data: {
        organizationId: auth.organizationId,
        botId: auth.botId,
        type: 'url',
        sourceValue: url,
        status: 'CREATED',
      },
      select: { id: true },
    })
    return NextResponse.json({message: 'URL added successfully', id: source.id})
  } catch (e: unknown) { 
    console.error('Error adding URL:', e)
    return NextResponse.json({ error: 'Failed to add URL' }, { status: 500 })
  }

}