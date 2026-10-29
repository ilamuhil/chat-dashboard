import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function load(relative, imports, globals = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`)
    return imports[name]
  }, console, ...globals })
  return exports
}

test('minting an agent token never changes mode, including explicit takeover', async () => {
  let signed
  const route = load('../app/api/auth/agent/token/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    '@/lib/auth-token': { verifyAuthToken: () => ({ sub: 'staff-a' }) },
    '@/lib/jwt': { getSecretKey: () => 'test', signToken: payload => { signed = payload; return 'signed' } },
    '@/lib/prisma': { prisma: {
      conversationsMeta: { findUnique: async () => ({ id: 'chat-a', botId: 'bot-a', organizationId: 'org-a', status: 'open', handoverVersion: 7 }),
        update: async () => { throw new Error('Mode changed before socket authentication') } },
      organizationMembers: { findFirst: async () => ({ id: 'member-a' }) },
      users: { findUnique: async () => ({ fullName: 'Test counsellor' }) },
    } },
  })
  const result = await route.POST({
    json: async () => ({ conversation_id: 'chat-a', agent_takeover: true }),
    headers: { get: () => 'Bearer dashboard-token' }, cookies: { get: () => null },
  })
  assert.equal(result.status, 200)
  assert.equal(signed.agent_takeover, true)
  assert.equal(signed.sub, 'staff-a')
  assert.equal(signed.handover_version, 7)
})

function socketHook() {
  const effects = [], states = [], timers = new Map(), instances = [], closed = []
  let nextTimer = 0
  class Socket {
    static OPEN = 1
    static CONNECTING = 0
    readyState = 0
    sent = []
    constructor() { instances.push(this) }
    send(text) { this.sent.push(JSON.parse(text)) }
    close(code, reason) { this.readyState = 3; this.onclose?.({ code, reason }) }
  }
  const hooks = {
    useRef: value => ({ current: value }),
    useState: value => [value, next => states.push(next)],
    useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
  }
  const loaded = load('../app/dashboard/users/conversations/[id]/useChatSocket.ts', { react: hooks }, {
    WebSocket: Socket, process: { env: { NEXT_PUBLIC_PYTHON_SERVER_URL: 'https://chat.example' } },
    setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, delay }); return nextTimer },
    clearTimeout: id => timers.delete(id),
    setInterval: () => 999, clearInterval() {},
  })
  const hook = loaded.useChatSocket({ isOpen: true, token: 'token-a', conversationId: 'chat-a',
    onCloseCleanUp: reason => closed.push(reason) })
  const cleanups = effects.map(fn => fn())
  const socket = instances[0]
  return { hook, socket, states, timers, closed, cleanup: () => cleanups.forEach(fn => fn?.()) }
}

test('queued messages and joined status wait for server authentication confirmation', () => {
  const { hook, socket, states, cleanup } = socketHook()
  hook.sendJsonMessage({ type: 'agent_joined', conversation_id: 'chat-a' })
  socket.readyState = 1
  socket.onopen()
  assert.equal(socket.sent.length, 1)
  assert.equal(socket.sent[0].token, 'token-a')
  assert.equal(states.includes('open'), false)
  socket.onmessage({ data: JSON.stringify({ type: 'agent_ready' }) })
  assert.equal(states.includes('open'), true)
  assert.equal(socket.sent[1].type, 'agent_joined')
  cleanup()
})

for (const code of [1008, 4001]) {
  test(`permanent socket rejection ${code} cannot automatically reclaim the conversation`, () => {
    const { socket, states, timers, closed, cleanup } = socketHook()
    socket.readyState = 1
    socket.onopen()
    socket.onclose({ code, reason: 'Connection replaced or rejected' })
    assert.equal(timers.size, 0)
    assert.equal(states.at(-1), 'closed')
    assert.equal(closed.length, 1)
    cleanup()
  })
}

test('transient disconnection still retries', () => {
  const { socket, timers, cleanup } = socketHook()
  socket.readyState = 1
  socket.onopen()
  socket.onclose({ code: 1011, reason: 'Temporary interruption' })
  assert.equal([...timers.values()].some(timer => timer.delay === 2000), true)
  cleanup()
})
