import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../app/api/dashboard/overview/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler(conversations, organizationId = 'org-a') {
  const prisma = {
    bots: { count: async () => 0 },
    trainingSources: { count: async () => 0, groupBy: async () => [] },
    apiKeys: { count: async () => 0 },
    organizationMembers: { count: async () => 0 },
    leads: { count: async () => 0 },
    conversationsMeta: {
      count: async () => conversations.length,
      findMany: async ({ where, select, take }) => {
        assert.equal(where.organizationId, 'org-a')
        assert.equal(take, 5)
        // Respect the query projection so omitting the lead relation reproduces the bug.
        return conversations.map(row => Object.fromEntries(
          Object.keys(select).map(key => [key, row[key]]),
        ))
      },
    },
  }
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth/auth-server': { requireAuthUserId: async () => 'staff-a' },
    '@/lib/organization/current-organization': { resolveCurrentOrganizationId: async () => organizationId },
    '@/lib/core/prisma': { prisma },
  }
  const loaded = { exports: {} }
  runInNewContext(compiled, {
    exports: loaded.exports,
    require: name => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`)
      return imports[name]
    },
  })
  return loaded.exports.GET
}

const conversation = overrides => ({
  id: 'chat-a', userName: null, userEmail: null, lead: null,
  status: 'open', isArchived: false, lastMessageSnippet: 'Hello',
  lastMessageAt: null, createdAt: new Date('2026-10-30T00:00:00Z'),
  ...overrides,
})

test('overview uses captured lead details and falls back for legacy or unnamed visitors', async () => {
  const rows = [
    conversation({ lead: { name: '  Priya  ', email: 'priya@example.invalid' } }),
    conversation({ userName: 'Old name', userEmail: 'old@example.invalid', lead: { name: 'Updated name', email: 'updated@example.invalid' } }),
    conversation({ userName: '  Legacy visitor  ', userEmail: 'legacy@example.invalid' }),
    conversation({ userName: 'Legacy visitor', lead: { name: '   ', email: '' } }),
    conversation({ userName: '   ', lead: { name: '', email: null } }),
    conversation({}),
  ]
  const response = await handler(rows)()
  assert.equal(response.status, 200)
  const recent = response.body.recentConversations
  assert.deepEqual(Array.from(recent, row => row.name), [
    'Priya', 'Updated name', 'Legacy visitor', 'Legacy visitor', 'Anonymous visitor', 'Anonymous visitor',
  ])
  assert.deepEqual(Array.from(recent, row => row.email), [
    'priya@example.invalid', 'updated@example.invalid', 'legacy@example.invalid', null, null, null,
  ])
  assert.equal(recent[0].snippet, 'Hello')
  assert.equal(recent[0].createdAt, '2026-10-30T00:00:00.000Z')
  assert.equal(recent[0].lastMessageAt, null)
})

test('overview requires a selected organization', async () => {
  const response = await handler([], null)()
  assert.equal(response.status, 400)
})
