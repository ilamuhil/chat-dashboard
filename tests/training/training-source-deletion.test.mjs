import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../app/api/training-source/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function handler({ status = 'trained', count = 1, upstreamError, unauthorized = false } = {}) {
  const calls = []
  const prisma = {
    trainingSources: {
      findFirst: async () => ({ id: 'source-a', type: 'url', status, sourceValue: 'example.invalid' }),
      deleteMany: async () => { calls.push('delete_source'); return { count } },
      update: async () => { throw new Error('Dashboard must not mark trained sources deleted') },
    },
    files: {
      deleteMany: async () => { calls.push('delete_file_record') },
    },
    $transaction: async callback => callback(prisma),
  }
  const failure = { status: 401 }
  const imports = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    '@/lib/auth/route-guards': { requireUserOrgAndBot: async () => unauthorized
      ? { ok: false, response: failure }
      : { ok: true, organizationId: 'org-a', userId: 'staff-a' } },
    '@/lib/core/prisma': { prisma },
    '@/lib/auth/jwt': { getSecretKey: () => 'test-key', signToken: payload => {
      assert.equal(payload.sub, 'staff-a')
      return 'signed-staff-token'
    } },
    '@/lib/http/axios-server-config': { pythonApiRequest: async (method, path, token) => {
      calls.push('chat_api')
      assert.equal(method, 'DELETE')
      assert.equal(path, '/api/training/delete/source-a')
      assert.equal(token, 'signed-staff-token')
      if (upstreamError) throw upstreamError
      return { message: 'Training source removed. File cleanup queued.', job_id: 'job-a' }
    } },
    '@/lib/storage/filemanagement': {
      fileExists: async () => true,
      deleteFile: async () => { calls.push('delete_stored_file') },
    },
    axios: { isAxiosError: error => Boolean(error.isAxiosError) },
  }
  const loaded = { exports: {} }
  runInNewContext(compiled, {
    exports: loaded.exports,
    require: name => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`)
      return imports[name]
    },
    console: { log() {}, error() {} },
  })
  return { remove: () => loaded.exports.DELETE({ json: async () => ({ source_id: 'source-a', bot_id: 'bot-a' }) }), calls, prisma }
}

test('trained-source deletion relies on the chat API and propagates its result', async () => {
  const { remove, calls } = handler()
  const response = await remove()
  assert.equal(response.status, 200)
  assert.equal(response.body.job_id, 'job-a')
  assert.deepEqual(calls, ['chat_api'])
})

test('upstream failure never marks the dashboard source deleted', async () => {
  const { remove, calls } = handler({ upstreamError: {
    isAxiosError: true, response: { status: 503, data: { error: 'Temporarily unavailable' } },
  } })
  const response = await remove()
  assert.equal(response.status, 503)
  assert.deepEqual(calls, ['chat_api'])
})

test('an untrained URL that starts training concurrently is not deleted', async () => {
  const { remove, calls } = handler({ status: 'created', count: 0 })
  assert.equal((await remove()).status, 409)
  assert.deepEqual(calls, ['delete_source'])
})

test('an untrained file that starts training concurrently keeps its file records and storage', async () => {
  const { remove, calls, prisma } = handler({ status: 'created', count: 0 })
  prisma.trainingSources.findFirst = async () => ({
    id: 'source-a', type: 'file', status: 'created', sourceValue: 'uploads/test',
  })
  assert.equal((await remove()).status, 409)
  assert.deepEqual(calls, ['delete_source'])
})

test('untrained file deletion removes its record and stored object', async () => {
  const { remove, calls, prisma } = handler({ status: 'created' })
  prisma.trainingSources.findFirst = async () => ({
    id: 'source-a', type: 'file', status: 'created', sourceValue: 'uploads/test',
  })
  assert.equal((await remove()).status, 200)
  assert.deepEqual(calls, ['delete_source', 'delete_file_record', 'delete_stored_file'])
})

test('unauthenticated callers cannot reach source deletion', async () => {
  const { remove, calls } = handler({ unauthorized: true })
  assert.equal((await remove()).status, 401)
  assert.deepEqual(calls, [])
})
