import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { Client } from 'pg'
import {
  captureConfigSchema,
  readCaptureConfig,
} from '../../lib/widget/capture-config'

test('starter configuration supports existing bots and validates bounds and duplicates', () => {
  assert.deepEqual(readCaptureConfig({}).conversationStarters, {
    enabled: false,
    questions: [],
  })
  for (const questions of [
    [],
    [''],
    ['Fees?', ' fees? '],
    ['a'.repeat(121)],
    ['1', '2', '3', '4', '5'],
  ])
    assert.equal(
      captureConfigSchema.safeParse({
        conversationStarters: { enabled: true, questions },
      }).success,
      false,
    )
  const result = captureConfigSchema.parse({
    required: { name: false, email: false, phone: true },
    questions: [],
    hostedEnabled: true,
    conversationStarters: { enabled: true, questions: [' Courses? '] },
  })
  assert.deepEqual(result.conversationStarters.questions, ['Courses?'])
  assert.equal(result.required.phone, true)
  assert.equal(result.hostedEnabled, true)
  const recovered = readCaptureConfig({
    ...result,
    conversationStarters: { enabled: true, questions: [''] },
  })
  assert.deepEqual(recovered.required, result.required)
  assert.equal(recovered.hostedEnabled, true)
  assert.equal(recovered.conversationStarters.enabled, false)
})

test(
  'live starter settings enforce roles, retain capture settings, reject stale saves and reach the public widget',
  {
    skip: process.env.RUN_STARTER_HTTP_TESTS !== 'true',
    timeout: 120000,
  },
  async () => {
    const db = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    })
    await db.connect()
    const org = `starter-test-${randomUUID()}`,
      other = `starter-test-${randomUUID()}`
    const bot = randomUUID(),
      foreign = randomUUID()
    const users = Object.fromEntries(
      ['owner', 'admin', 'counsellor', 'viewer'].map((role) => [
        role,
        randomUUID(),
      ]),
    )
    const origin = process.env.MVP_DASHBOARD_URL || 'http://localhost:4000'
    const path = `/api/bots/${bot}/capture`
    const request = (role: string, endpoint: string, body?: unknown) =>
      fetch(origin + endpoint, {
        signal: AbortSignal.timeout(30000),
        method: body === undefined ? 'GET' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          Cookie: `auth_token=${jwt.sign({ sub: users[role], type: 'access' }, process.env.AUTH_JWT_SECRET!, { algorithm: 'HS256', issuer: 'chat-dashboard', audience: 'chat-dashboard-web', expiresIn: '5m' })}; current_organization_id=${org}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      })
    async function expect(response: Response, status: number) {
      const data = await response.json()
      assert.equal(response.status, status, JSON.stringify(data))
      return data
    }
    try {
      await db.query(
        'INSERT INTO public.organizations(id,name) VALUES($1,$1),($2,$2)',
        [org, other],
      )
      for (const [role, id] of Object.entries(users)) {
        await db.query(
          'INSERT INTO public.users(id,email,full_name,updated_at) VALUES($1,$2,$3,now())',
          [id, `${id}@example.invalid`, `Starter test ${role}`],
        )
        await db.query(
          'INSERT INTO public.organization_members(id,organization_id,user_id,role) VALUES($1,$2,$3,$4)',
          [randomUUID(), org, id, role],
        )
      }
      const original = {
        required: { name: false, email: false, phone: true },
        questions: [
          {
            id: 'field_qualification',
            label: 'Qualification',
            type: 'text',
            required: true,
            options: [],
          },
        ],
        hostedEnabled: true,
      }
      for (const [id, organization] of [
        [bot, org],
        [foreign, other],
      ])
        await db.query(
          "INSERT INTO public.bots(id,name,organization_id,capture_leads,capture_name,capture_email,capture_phone,lead_capture_config) VALUES($1,'Starter test bot',$2,true,false,false,true,$3)",
          [id, organization, JSON.stringify(original)],
        )
      const initial = await expect(await request('owner', path), 200)
      const config = {
        ...initial.config,
        conversationStarters: {
          enabled: true,
          questions: [
            'What courses do you offer?',
            'What are the fees?',
            'How do I apply?',
          ],
        },
      }
      const body = { config, updatedAt: initial.updatedAt }
      for (const role of ['viewer', 'counsellor']) {
        await expect(await request(role, path), 403)
        await expect(await request(role, path, body), 403)
      }
      await expect(await request('owner', `/api/bots/${foreign}/capture`), 404)
      const changed = await expect(await request('owner', path, body), 200)
      await expect(await request('owner', path, body), 409)
      await expect(
        await request('admin', path, {
          config: {
            ...config,
            conversationStarters: {
              enabled: true,
              questions: ['Same?', 'same?'],
            },
          },
          updatedAt: changed.updatedAt,
        }),
        400,
      )
      const saved = await expect(await request('admin', path), 200)
      assert.deepEqual(saved.config.required, original.required)
      assert.deepEqual(saved.config.questions, original.questions)
      assert.equal(saved.config.hostedEnabled, true)
      assert.deepEqual(
        saved.config.conversationStarters,
        config.conversationStarters,
      )
      const profile = await expect(
        await fetch(origin + '/api/widget/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: `hosted:${bot}` }),
          signal: AbortSignal.timeout(30000),
        }),
        200,
      )
      assert.deepEqual(
        profile.profile.conversationStarters,
        config.conversationStarters,
      )
      assert.equal(profile.profile.capture.required.phone, true)
      assert.equal(
        profile.profile.capture.questions[0].id,
        'field_qualification',
      )
      await expect(
        await request('admin', path, {
          config: {
            ...config,
            conversationStarters: {
              enabled: false,
              questions: config.conversationStarters.questions,
            },
          },
          updatedAt: saved.updatedAt,
        }),
        200,
      )
    } finally {
      try {
        await db.query(
          'DELETE FROM public.organizations WHERE id=ANY($1::text[])',
          [[org, other]],
        )
        await db.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])', [
          Object.values(users),
        ])
      } finally {
        await db.end()
      }
    }
  },
)
