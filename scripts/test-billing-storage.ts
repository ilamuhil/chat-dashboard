import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { prisma } from '../lib/core/prisma'
import { signAuthToken } from '../lib/auth/auth-token'
import { deleteFile, objectSize } from '../lib/storage/filemanagement'
import { ensureBilling, withBillingLock } from '../lib/billing/service'
import { PLANS } from '../lib/billing/catalog'

const base = process.env.BILLING_TEST_BASE_URL || 'http://localhost:4000'
async function main() {
  const orgId = 'billing-storage-test-' + randomUUID()
  const user = await prisma.users.create({
    data: { email: orgId + '@example.invalid' },
  })
  let objectPath: string | null = null
  const passed: string[] = []
  try {
    await prisma.organizations.create({
      data: {
        id: orgId,
        organizationMembers: { create: { userId: user.id, role: 'admin' } },
      },
    })
    const bot = await prisma.bots.create({
      data: { organizationId: orgId, name: 'Temporary billing storage test' },
    })
    await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
    const limits = {
      ...PLANS.trial.limits,
      fileBytes: 512,
      storageBytes: 512,
      sources: 1,
    }
    await prisma.billingAccount.update({
      where: { organizationId: orgId },
      data: { limits },
    })
    const cookie = `auth_token=${signAuthToken({ userId: user.id }, '10m')}; current_organization_id=${orgId}`
    const upload = async (text: string, filename = 'billing-check.txt') => {
      const form = new FormData()
      form.set('bot_id', bot.id)
      form.append('files', new File([text], filename, { type: 'text/plain' }))
      return fetch(base + '/api/training-source/file/upload', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: form,
      })
    }
    let response = await upload('a'.repeat(513))
    assert.equal(response.status, 400)
    passed.push('Per-file limit rejects oversized input before storage upload')
    response = await upload('a'.repeat(400))
    assert.equal(response.status, 200, await response.clone().text())
    const { trainingSourceIds: ids } = await response.json()
    const source = await prisma.trainingSources.findUniqueOrThrow({
      where: { id: ids[0] },
    })
    objectPath = source.sourceValue
    assert.equal(await objectSize('bot-files', objectPath!), 400)
    response = await upload('a'.repeat(400))
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).trainingSourceIds, ids)
    assert.equal(
      await prisma.trainingSources.count({ where: { organizationId: orgId } }),
      1,
    )
    passed.push(
      'Real R2 upload succeeds; duplicate content reuses one source and storage allocation',
    )
    response = await upload('b'.repeat(100))
    assert.equal(response.status, 409)
    assert.match(await response.text(), /sources.*limit/)
    await prisma.billingAccount.update({
      where: { organizationId: orgId },
      data: { limits: { ...limits, sources: 2 } },
    })
    response = await upload('b'.repeat(200))
    assert.equal(response.status, 409)
    assert.match(await response.text(), /storage.*limit/)
    passed.push(
      'Source and storage limits include uploads awaiting finalization',
    )
    const finalize = () =>
      fetch(base + '/api/training-source/file/finalize', {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: bot.id, source_ids: ids }),
      })
    await prisma.trainingSources.update({
      where: { id: ids[0] },
      data: { sizeBytes: 399 },
    })
    response = await finalize()
    assert.equal(response.status, 500)
    assert.equal(
      await prisma.files.count({ where: { organizationId: orgId } }),
      0,
    )
    await prisma.trainingSources.update({
      where: { id: ids[0] },
      data: { sizeBytes: 400 },
    })
    response = await finalize()
    assert.equal(response.status, 200, await response.clone().text())
    assert.equal(
      await prisma.files.count({ where: { organizationId: orgId } }),
      1,
    )
    assert.equal((await finalize()).status, 200)
    assert.equal(
      await prisma.files.count({ where: { organizationId: orgId } }),
      1,
    )
    passed.push('Finalization checks actual R2 size and remains idempotent')
    const exportResponse = await fetch(base + '/api/billing/export', {
      headers: { Cookie: cookie },
    })
    assert.equal(
      exportResponse.status,
      200,
      await exportResponse.clone().text(),
    )
    assert.equal((await exportResponse.json()).organization.id, orgId)
    passed.push('Dashboard export reaches the running Docker messaging server')
    const output = process.env.BILLING_TEST_OUTPUT
    if (output) await writeFile(output, JSON.stringify({ passed }, null, 2))
    console.log(JSON.stringify({ passed }))
  } finally {
    if (objectPath) await deleteFile('bot-files', objectPath)
    await prisma.organizations.deleteMany({ where: { id: orgId } })
    await prisma.billingTrialClaim.deleteMany({ where: { userId: user.id } })
    await prisma.users.deleteMany({ where: { id: user.id } })
    await prisma.$disconnect()
  }
}
void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
