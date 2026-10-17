import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { prisma } from '../lib/prisma'
import { hashApiKey } from '../lib/utils'
import { widgetSettingsSchema } from '../lib/widget-profile'
import { POST, OPTIONS } from '../app/api/widget/config/route'

async function main() {
  if (process.env.RUN_WIDGET_PROFILE_DB_TEST !== '1')
    throw new Error(
      'Run only on an isolated test branch with RUN_WIDGET_PROFILE_DB_TEST=1',
    )
  const organizationId = `widget-profile-test-${randomUUID()}`
  const otherOrganizationId = `${organizationId}-other`
  const botId = randomUUID(),
    otherBotId = randomUUID(),
    key = `test-${randomUUID()}`
  const request = (body: unknown) =>
    new NextRequest('http://localhost/api/widget/config', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  const settings = {
    support_email: 'admissions@example.com',
    support_team_name: 'Admissions',
    human_reply_minutes: '15',
    support_hours: 'Mon–Fri 9–5 IST',
    help_center_url: 'https://example.com/help',
    avatar_url: '',
  }
  assert.equal(widgetSettingsSchema.safeParse(settings).success, true)
  for (const bad of [
    { support_email: 'bad' },
    { human_reply_minutes: '0' },
    { human_reply_minutes: '2.5' },
    { human_reply_minutes: '10081' },
    { help_center_url: 'javascript:alert(1)' },
    { avatar_url: 'http://example.com/a.png' },
  ]) {
    assert.equal(
      widgetSettingsSchema.safeParse({ ...settings, ...bad }).success,
      false,
    )
  }
  try {
    await prisma.organizations.createMany({
      data: [{ id: organizationId }, { id: otherOrganizationId }],
    })
    await prisma.bots.create({
      data: {
        id: botId,
        organizationId,
        name: 'Admissions guide',
        supportEmail: settings.support_email,
        supportTeamName: settings.support_team_name,
        humanReplyMinutes: 15,
        supportHours: settings.support_hours,
        helpCenterUrl: settings.help_center_url,
        businessDescription: 'PRIVATE INTERNAL PROMPT',
      },
    })
    await prisma.bots.create({
      data: {
        id: otherBotId,
        organizationId: otherOrganizationId,
        name: 'Other tenant',
      },
    })
    const apiKey = await prisma.apiKeys.create({
      data: {
        name: 'Isolated profile test',
        keyHash: hashApiKey(key),
        botId,
        organizationId,
        isActive: true,
      },
    })
    const before = await prisma.conversationsMeta.count({
      where: { organizationId },
    })
    const response = await POST(request({ api_key: key, bot_id: botId }))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const json = await response.json()
    assert.equal(json.profile.name, 'Admissions guide')
    assert.equal(json.profile.supportEmail, settings.support_email)
    assert.equal(json.profile.humanReplyMinutes, 15)
    assert.equal(json.profile.avatarUrl, null)
    assert.equal('businessDescription' in json.profile, false)
    assert.equal('organizationId' in json.profile, false)
    assert.equal('token' in json, false)
    assert.equal(
      await prisma.conversationsMeta.count({ where: { organizationId } }),
      before,
    )
    assert.equal(
      (await POST(request({ api_key: key, bot_id: otherBotId }))).status,
      401,
    )
    assert.equal(
      (await POST(request({ api_key: 'wrong', bot_id: botId }))).status,
      401,
    )
    assert.equal(
      (await POST(request({ api_key: key, bot_id: 'invalid' }))).status,
      400,
    )
    assert.equal(
      (
        await POST(
          new NextRequest('http://localhost/api/widget/config', {
            method: 'POST',
            body: 'not json',
          }),
        )
      ).status,
      400,
    )
    await prisma.apiKeys.update({
      where: { id: apiKey.id },
      data: { isActive: false },
    })
    assert.equal(
      (await POST(request({ api_key: key, bot_id: botId }))).status,
      401,
    )
    await prisma.apiKeys.update({
      where: { id: apiKey.id },
      data: { isActive: true, organizationId: otherOrganizationId },
    })
    assert.equal(
      (await POST(request({ api_key: key, bot_id: botId }))).status,
      404,
    )
    await prisma.apiKeys.update({
      where: { id: apiKey.id },
      data: { organizationId },
    })
    await prisma.bots.update({
      where: { id: botId },
      data: { deletedAt: new Date() },
    })
    assert.equal(
      (await POST(request({ api_key: key, bot_id: botId }))).status,
      404,
    )
    const options = await OPTIONS()
    assert.equal(options.status, 204)
    assert.equal(options.headers.get('Access-Control-Allow-Origin'), '*')
    console.log(
      'Widget profile integration passed: validation, persistence, tenant/key scoping, deleted bots, CORS, allowlist, and no conversation creation.',
    )
  } finally {
    await prisma.organizations.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    })
    await prisma.$disconnect()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
