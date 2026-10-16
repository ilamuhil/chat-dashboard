import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/auth-server'
import { uploadFile, deleteFile } from '@/lib/filemanagement'
import { prisma } from '@/lib/prisma'
import { createHash } from 'node:crypto'
import {
  withBillingLock,
  assertCapacity,
  BillingError,
} from '@/lib/billing/service'
import type { Limits } from '@/lib/billing/catalog'
export const runtime = 'nodejs'
const BUCKET = 'bot-files'
const extensions = /\.(pdf|csv|txt|md|markdown|docx|html|htm)$/i
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const botId = String(form.get('bot_id') || '')
    const files = form
      .getAll('files')
      .filter((file): file is File => file instanceof File)
    if (!botId || !files.length || files.length > 20)
      return NextResponse.json(
        { error: 'Select 1–20 supported files.' },
        { status: 400 },
      )
    const auth = await requireUserOrgAndBot(request, botId)
    if (!auth)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const account = await withBillingLock(auth.organizationId, (tx) =>
      assertCapacity(tx, auth.organizationId, 'sources', 0),
    )
    const limits = account.limits as Limits
    for (const file of files) {
      if (
        !extensions.test(file.name) ||
        !file.size ||
        file.size > limits.fileBytes
      )
        throw new BillingError(
          'Use PDF, CSV, TXT, Markdown, DOCX or HTML within your per-file limit.',
          400,
        )
    }
    const byHash = new Map<string, File>()
    for (const file of files)
      byHash.set(
        createHash('sha256')
          .update(Buffer.from(await file.arrayBuffer()))
          .digest('hex'),
        file,
      )
    const sources = await withBillingLock(auth.organizationId, async (tx) => {
      const existing = await tx.trainingSources.findMany({
        where: {
          organizationId: auth.organizationId,
          botId,
          deletedAt: null,
          type: 'file',
          contentHash: { in: [...byHash.keys()] },
        },
      })
      const missing = [...byHash].filter(
        ([hash]) => !existing.some((source) => source.contentHash === hash),
      )
      await assertCapacity(tx, auth.organizationId, 'sources', missing.length)
      await assertCapacity(
        tx,
        auth.organizationId,
        'storageBytes',
        missing.reduce((total, [, file]) => total + file.size, 0),
      )
      const created = await tx.trainingSources.createManyAndReturn({
        data: missing.map(([hash, file]) => ({
          organizationId: auth.organizationId,
          botId,
          type: 'file',
          originalFilename: file.name,
          status: 'pending',
          sizeBytes: file.size,
          mimeType: file.type,
          contentHash: hash,
          sourceValue:
            'organizations/' +
            auth.organizationId +
            '/bots/' +
            botId +
            '/' +
            hash,
        })),
      })
      return { existing, created }
    })
    const uploads = await Promise.allSettled(
      sources.created.map((source) =>
        uploadFile(
          byHash.get(source.contentHash!)!,
          source.sourceValue!,
          BUCKET,
        ),
      ),
    )
    if (uploads.some((result) => result.status === 'rejected')) {
      // Wait for every upload before cleanup, so late uploads cannot leave untracked objects.
      const cleanup = await Promise.allSettled(
        sources.created.map((source) =>
          deleteFile(BUCKET, source.sourceValue!),
        ),
      )
      const removed = sources.created.filter(
        (_, index) => cleanup[index].status === 'fulfilled',
      )
      await prisma.trainingSources.deleteMany({
        where: {
          id: { in: removed.map((source) => source.id) },
          status: 'pending',
        },
      })
      throw new BillingError(
        'Upload did not finish. Please retry; incomplete sources were not added.',
        502,
      )
    }
    return NextResponse.json({
      trainingSourceIds: [...sources.existing, ...sources.created].map(
        (source) => source.id,
      ),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BillingError
            ? error.message
            : 'Could not upload the files. Please retry.',
      },
      { status: error instanceof BillingError ? error.status : 500 },
    )
  }
}
