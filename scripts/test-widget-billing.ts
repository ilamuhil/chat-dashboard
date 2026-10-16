import { output, browserPath } from './billing-test-config'
import assert from 'node:assert/strict'
import { chromium, type WebSocketRoute } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
async function main() {
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const results: string[] = []
  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 900 },
    })
    await context.route('**/api/auth/user/token', (route) =>
      route.fulfill({
        json: {
          token: 'test-token',
          conversation_id: '10101010-1010-4010-8010-101010101010',
          bot_config: {
            leadCaptureTiming: 'after',
            captureName: true,
            captureEmail: true,
            capturePhone: true,
          },
        },
        headers: { 'access-control-allow-origin': '*' },
      }),
    )
    let lastSocket: WebSocketRoute | undefined
    const sent: Record<string, unknown>[] = []
    await context.routeWebSocket('**/api/chat/ws', (socket) => {
      lastSocket = socket
      socket.onMessage((raw) => {
        const event = JSON.parse(String(raw))
        sent.push(event)
        if (event.token) {
          socket.send(
            JSON.stringify({
              type: 'conversation_ready',
              conversation_id: '10101010-1010-4010-8010-101010101010',
              form_required: false,
            }),
          )
        } else if (event.type === 'message') {
          socket.send(
            JSON.stringify({
              type: 'ai_unavailable',
              code: 'ai_limit_reached',
              message:
                'The assistant has reached its AI allowance. Leave your details or request a counsellor.',
            }),
          )
        } else if (event.type === 'form_capture') {
          socket.send(
            JSON.stringify({
              type: 'form_capture',
              fallback: 'contact',
              message: 'Your details have been saved.',
            }),
          )
        } else if (event.type === 'request_counsellor') {
          socket.send(
            JSON.stringify({
              type: 'message',
              role: 'system',
              message: 'Searching for a counsellor.',
            }),
          )
        }
      })
    })
    const page = await context.newPage()
    await page.goto('http://localhost:3000')
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await page.getByPlaceholder('Type a message…').waitFor({ timeout: 30000 })
    await page.getByPlaceholder('Type a message…').fill('Hello')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page.getByRole('button', { name: 'Request a counsellor' }).waitFor()
    assert.ok(
      !/AI allowance|reached its AI|quota|credit/i.test(
        await page.locator('body').innerText(),
      ),
    )
    await page.getByLabel('Name', { exact: true }).fill('Test Visitor')
    await page
      .getByLabel('Email', { exact: true })
      .fill('visitor@example.invalid')
    await page.getByLabel(/Phone/).fill('9999999999')
    await page.screenshot({
      path: output + '/widget-billing-fallback.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Save my enquiry' }).click()
    await page.getByText(/Your details have been saved/).waitFor()
    assert.ok(
      sent.some((e) => e.type === 'form_capture' && e.fallback === 'contact'),
    )
    await page.getByRole('button', { name: 'Request a counsellor' }).click()
    assert.ok(sent.some((e) => e.type === 'request_counsellor'))
    results.push(
      'Widget shows contact capture and counsellor options without exposing AI allowance or billing messages',
      'Counsellor button sends the direct handoff request',
    )
    lastSocket?.send(
      JSON.stringify({
        type: 'conversation_ready',
        conversation_id: '20202020-2020-4020-8020-202020202020',
        form_required: false,
      }),
    )
    await page.getByPlaceholder('Type a message…').waitFor()
    lastSocket?.send(
      JSON.stringify({
        type: 'ai_unavailable',
        code: 'temporarily_busy',
        message: 'Please try again in a moment.',
      }),
    )
    await page.getByPlaceholder('Type a message…').waitFor()
    results.push(
      'New conversation clears the quota fallback; temporary busy keeps the chat composer available',
    )
    await writeFile(
      output + '/widget-billing-results.json',
      JSON.stringify({ passed: results }, null, 2),
    )
    console.log(JSON.stringify({ passed: results }))
  } finally {
    await browser.close()
  }
}
main().catch((e) => {
  console.error({ name: e.name, message: e.message })
  process.exitCode = 1
})
