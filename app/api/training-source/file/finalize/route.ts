import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'


export async function POST(request: NextRequest) { 
  const { bot_id, source_ids } = await request.json()
  if (!bot_id || !source_ids || !Array.isArray(source_ids)) { 
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
      }
    })
    
  }
}