import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactHandler } from './contact-enquiry'

const valid = {
  name: 'Example User',
  email: 'visitor@example.org',
  institution: 'Example Institute',
  websiteUrl: 'https://example.org',
  interest: 'product',
  message: 'We would like to understand the admissions chatbot setup.',
  consent: true,
  website: '',
}
function request(body: unknown = valid, origin = 'https://example.org') {
  return new Request('https://example.org/api/contact', {
    method: 'POST',
    headers: {
      origin,
      'Content-Type': 'application/json',
      'x-forwarded-for': '192.0.2.1',
    },
    body: JSON.stringify(body),
  })
}

test('delivers the enquiry to the configured inbox with visitor reply-to and escaped content', async () => {
  const deliveries: Parameters<
    Parameters<typeof createContactHandler>[0]['deliver']
  >[0][] = []
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    deliver: async (message) => {
      deliveries.push(message)
    },
  })
  const result = await post(
    request({
      ...valid,
      institution: '<b>Example</b>',
      message: '<script>alert("test")</script> Please help with setup.',
    }),
  )
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { ok: true })
  assert.equal(deliveries.length, 1)
  assert.equal(deliveries[0].to, 'ilamuhil@gmail.com')
  assert.equal(deliveries[0].replyTo, valid.email)
  assert.ok(deliveries[0].htmlBody.includes('&lt;script&gt;'))
  assert.ok(!deliveries[0].htmlBody.includes('<script>'))
  assert.ok(deliveries[0].textBody.includes('Agreed to be contacted'))
})

test('rejects invalid details, missing consent, spam, and foreign origins without delivery', async () => {
  let deliveries = 0
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    deliver: async () => {
      deliveries++
    },
  })
  for (const body of [
    { ...valid, email: 'not-an-email' },
    { ...valid, consent: false },
    { ...valid, website: 'spam' },
    { ...valid, message: 'short' },
    { ...valid, websiteUrl: 'javascript:alert(1)' },
  ]) {
    assert.equal((await post(request(body))).status, 400)
  }
  assert.equal(
    (await post(request(valid, 'https://other.example'))).status,
    403,
  )
  assert.equal(deliveries, 0)
})

test('rejects malformed or oversized bodies without delivery', async () => {
  let deliveries = 0
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    deliver: async () => {
      deliveries++
    },
  })
  const malformed = new Request('https://example.org/api/contact', {
    method: 'POST',
    headers: {
      origin: 'https://example.org',
      'Content-Type': 'application/json',
    },
    body: '{',
  })
  assert.equal((await post(malformed)).status, 400)
  assert.equal(
    (await post(request({ ...valid, message: 'x'.repeat(20_000) }))).status,
    413,
  )
  assert.equal(deliveries, 0)
})

test('accepts the browser host when Next normalizes the internal request URL', async () => {
  let deliveries = 0
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    deliver: async () => {
      deliveries++
    },
  })
  const local = new Request('http://localhost:4010/api/contact', {
    method: 'POST',
    headers: {
      origin: 'http://127.0.0.1:4010',
      host: '127.0.0.1:4010',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(valid),
  })
  assert.equal((await post(local)).status, 200)
  assert.equal(deliveries, 1)
})

test('throttles repeated submissions and permits requests after the window expires', async () => {
  let time = Date.now()
  let deliveries = 0
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    now: () => time,
    deliver: async () => {
      deliveries++
    },
  })
  for (let index = 0; index < 3; index++)
    assert.equal((await post(request())).status, 200)
  const limited = await post(request())
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '600')
  assert.equal(deliveries, 3)
  time += 600_001
  assert.equal((await post(request())).status, 200)
})

test('a provider failure never reports a successful submission', async () => {
  const post = createContactHandler({
    recipient: () => 'ilamuhil@gmail.com',
    deliver: async () => {
      throw new Error('Provider unavailable')
    },
  })
  const response = await post(request())
  assert.equal(response.status, 503)
  assert.ok(!(await response.json()).ok)
})
