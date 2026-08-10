import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { uploadFile, deleteFile } from '@/lib/filemanagement'

const FILE_UPLOAD_BUCKET =
  process.env.CHAT_FILE_BUCKET ??
  (() => {
    throw new Error('CHAT_FILE_BUCKET environment variable is not set')
  })()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1]
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication Failed' },
      { status: 401, headers: corsHeaders },
    )
  }
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'Authentication Failed' },
      { status: 401, headers: corsHeaders },
    )
  }
  //Authenticated now Authorize

  const botId = typeof payload.bot_id === 'string' ? payload.bot_id : null
  const conversationId =
    typeof payload.conversation_id === 'string' ? payload.conversation_id : null
  const organizationId =
    typeof payload.organization_id === 'string' ? payload.organization_id : null

  if (!botId || !conversationId || !organizationId) {
    return NextResponse.json(
      { error: 'Authentication Failed' },
      { status: 401, headers: corsHeaders },
    )
  }

  //check if the conversation and bot belongs to the organization
  const conversation = await prisma.conversationsMeta.findFirst({
    where: {
      id: conversationId,
      organizationId,
      botId,
    },
  })
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found/Not Authorized' },
      { status: 404, headers: corsHeaders },
    )
  }

  const formData: FormData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 400, headers: corsHeaders },
    )
  }

  const bucket = FILE_UPLOAD_BUCKET
  const file_key = `conversations/${conversationId}/${file.name}`

  try {
    const { success, url } = await uploadFile(file, file_key, bucket)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500, headers: corsHeaders },
      )
    }
    return NextResponse.json(
      { success: true, url },
      { status: 200, headers: corsHeaders },
    )
  } catch {
    //no need to log here as it will be logged in the uploadFile function
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500, headers: corsHeaders },
    )
  }
  //upload the file to R2 storage.
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1]
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication Failed' },
      { status: 401, headers: corsHeaders },
    )
  }
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'Authentication Failed' },
      { status: 401, headers: corsHeaders },
    )
  }

  const botId = typeof payload.bot_id === 'string' ? payload.bot_id : null
  const conversationId =
    typeof payload.conversation_id === 'string' ? payload.conversation_id : null
  const organizationId =
    typeof payload.organization_id === 'string' ? payload.organization_id : null
  const file_name = request.nextUrl.searchParams.get('file_name')

  if (!botId || !conversationId || !organizationId || !file_name) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: corsHeaders },
    )
  }
  const conversation = await prisma.conversationsMeta.findFirst({
    where: {
      id: conversationId,
      organizationId,
      botId,
    },
  })
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found/Not Authorized' },
      { status: 404, headers: corsHeaders },
    )
  }
  const bucket = FILE_UPLOAD_BUCKET
  const key = `conversations/${conversationId}/${file_name}`
  try {
    const { success } = await deleteFile(bucket, key)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500, headers: corsHeaders },
      )
    }
    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    )
  } catch {
    //no need to log here as it will be logged in the deleteFile function
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500, headers: corsHeaders },
    )
  }
}
