/** Run against an authorized test database with the dashboard/API running:
 * RUN_WIDGET_EMBEDDING_DB_TEST=1 pnpm exec tsx --env-file=.env.local scripts/test-widget-embedding.ts
 * Builds must already exist in ../chat_widget_ui/dist. Fixtures are retained in
 * .widget-test for reruns and manual inspection; no existing bots are modified.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { prisma } from '../lib/prisma'
import { hashApiKey } from '../lib/utils'
import { signAuthToken } from '../lib/auth-token'
import { getSecretKey, signToken } from '../lib/jwt'
import { pythonApiRequest } from '../lib/axios-server-config'
import { ensureBilling } from '../lib/billing/service'
import { buildWidgetEmbed } from '../lib/widget-embed'

const dashboard = process.env.WIDGET_TEST_DASHBOARD || 'http://localhost:4000'
const sitePort = Number(process.env.WIDGET_TEST_SITE_PORT || 4175)
const bundlePort = Number(process.env.WIDGET_TEST_BUNDLE_PORT || 4174)
const site = `http://localhost:${sitePort}`
const bundleUrl = `http://127.0.0.1:${bundlePort}/chat-widget-ui.iife.js`
const output = resolve(process.env.WIDGET_TEST_OUTPUT || '.widget-test')
type Fixture = {
  organizationId: string
  userId: string
  botId: string
  key: string
  name: string
}

async function fixture(): Promise<Fixture> {
  await mkdir(output, { recursive: true, mode: 0o700 })
  const file = resolve(output, 'fixtures.json')
  let existing: Fixture | undefined
  try {
    existing = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    /* First run. */
  }
  if (
    existing &&
    (await prisma.bots.findUnique({ where: { id: existing.botId } }))
  )
    return existing
  const f = {
    organizationId: randomUUID(),
    userId: randomUUID(),
    botId: randomUUID(),
    key: `bot_widget_test_${randomUUID()}`,
    name: 'Widget deployment test',
  }
  await prisma.$transaction(
    async (tx) => {
      await tx.users.create({
        data: {
          id: f.userId,
          email: `widget-${f.userId}@example.invalid`,
          fullName: 'Widget Test',
          emailVerified: true,
          onboardingCompleted: true,
        },
      })
      await tx.organizations.create({
        data: {
          id: f.organizationId,
          name: 'Widget deployment sandbox',
          isEmailVerified: true,
        },
      })
      await tx.organizationMembers.create({
        data: {
          organizationId: f.organizationId,
          userId: f.userId,
          role: 'admin',
        },
      })
      await tx.bots.create({
        data: {
          id: f.botId,
          organizationId: f.organizationId,
          name: f.name,
          instituteName: 'Sandbox website',
          tone: 'friendly',
          role: 'customer-support',
          firstMessage: 'Hello from the deployment test bot.',
          businessDescription:
            'A disposable bot used to verify website embedding and route settings.',
          captureLeads: false,
          leadCaptureTiming: 'start',
        },
      })
      await tx.apiKeys.create({
        data: {
          organizationId: f.organizationId,
          botId: f.botId,
          name: 'Widget deployment sandbox',
          keyHash: hashApiKey(f.key),
          isActive: true,
        },
      })
      await ensureBilling(tx, f.organizationId)
    },
    { maxWait: 30000, timeout: 60000 },
  )
  const privateKey = getSecretKey()
  assert.ok(privateKey)
  const token = signToken(
    {
      organization_id: f.organizationId,
      bot_id: f.botId,
      user_id: f.userId,
      type: 'dashboard_admin',
    },
    privateKey,
    '5m',
  )
  try {
    await pythonApiRequest('POST', '/api/model-config/create', token, {
      bot_id: f.botId,
      user_id: f.userId,
    })
  } catch {
    throw new Error(
      'The chat API could not create the disposable model configuration.',
    )
  }
  await writeFile(file, JSON.stringify(f, null, 2), { mode: 0o600 })
  return f
}

function html(f: Fixture, url: URL) {
  const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const mode = url.searchParams.get('installation') ?? 'auto'
  const config = JSON.stringify({ api_key: f.key, theme })
  const script =
    mode === 'auto'
      ? buildWidgetEmbed({
          url: bundleUrl,
          apiKey: f.key,
          theme,
        })
      : `<script src="${bundleUrl}" onload='window.${mode === 'alias' ? 'chatInject' : 'injectChat'}(${config})'></script>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Plain HTML widget sandbox</title>
    <style>body{margin:0;background:#f4f0e8;color:#293b38;font-family:Georgia,serif}main{max-width:900px;margin:90px auto;padding:32px}h1{font-size:48px;margin-bottom:20px}p{font-size:19px;line-height:1.7;max-width:600px}nav{display:flex;gap:16px;flex-wrap:wrap}a,button{color:#245d4c}button{border:2px solid red;background:yellow;font:inherit;padding:8px}strong{color:#245d4c}.badge{font:13px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#667c72}</style>
    ${script}</head><body><main><div class="badge">Deployment sandbox · plain HTML</div>
    <h1 id="host-heading">A website without React.</h1><p>This page loads the built widget from a separate origin using one script in its head. The host has its own typography and deliberately conflicting button styles.</p>
    <nav><a href="/pricing">Pricing</a><a href="/products/course">Products</a><a href="/private">Private page</a><a href="/checkout/payment">Checkout</a></nav>
    <p>Current route: <strong id="path">${url.pathname}</strong></p><button id="host-button">Host button style stays intact</button>
    <p>The widget theme comes from the embed settings. Route visibility comes from the dashboard.</p></main></body></html>`
}

// This disposable fixture exercises socket startup without running document training.
// Only its own draft configurations are activated; existing bots are untouched.
function activateFixture(f: Fixture) {
  const python = `
import json, sys, uuid
from sqlalchemy import select, update
from app.db.session import SessionLocal
from app.models.chat_db_models import BotConfigurations, EmbeddingConfigurations
f = json.load(sys.stdin)
with SessionLocal() as session:
    config = session.scalar(select(BotConfigurations).where(BotConfigurations.bot_id == uuid.UUID(f['botId']), BotConfigurations.created_by_user_id == uuid.UUID(f['userId'])))
    assert config is not None, 'Disposable model configuration missing'
    session.execute(update(EmbeddingConfigurations).where(EmbeddingConfigurations.id == config.embedding_configuration_id).values(state='active'))
    config.state = 'active'
    session.commit()
`
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      process.env.WIDGET_TEST_API_CONTAINER || 'chat_api-api-1',
      'python',
      '-c',
      python,
    ],
    {
      input: JSON.stringify({ botId: f.botId, userId: f.userId }),
      encoding: 'utf8',
    },
  )
  assert.equal(
    result.status,
    0,
    'Could not activate the disposable test model configuration: ' +
      result.stderr,
  )
}

async function main() {
  assert.equal(
    process.env.RUN_WIDGET_EMBEDDING_DB_TEST,
    '1',
    'Only run against an explicitly authorized test database.',
  )
  const f = await fixture()
  activateFixture(f)
  const bundle = await readFile(
    resolve(
      process.env.WIDGET_TEST_BUNDLE ||
        '../chat_widget_ui/dist/chat-widget-ui.iife.js',
    ),
  )
  assert.equal(
    bundle.includes(Buffer.from('process.env.NODE_ENV')),
    false,
    'Bundle must run without Node globals',
  )
  const assets = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/javascript' })
    response.end(bundle)
  })
  const host = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(html(f, new URL(request.url || '/', site)))
  })
  await new Promise<void>((resolve) =>
    assets.listen(bundlePort, '127.0.0.1', resolve),
  )
  await new Promise<void>((resolve) =>
    host.listen(sitePort, '127.0.0.1', resolve),
  )
  const browser = await chromium.launch({
    executablePath:
      process.env.WIDGET_TEST_BROWSER ||
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
  })
  const results: string[] = []
  const errors: string[] = []
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    await context.addCookies([
      {
        name: 'auth_token',
        value: signAuthToken({ userId: f.userId }, '1h'),
        url: dashboard,
      },
      {
        name: 'current_organization_id',
        value: f.organizationId,
        url: dashboard,
      },
    ])
    const admin = await context.newPage()
    admin.on('pageerror', (error) =>
      console.log('Dashboard browser error:', error.message),
    )
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    const requests: string[] = []
    const readyFrames: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    page.on('websocket', (socket) =>
      socket.on('framereceived', (event) => {
        if (String(event.payload).includes('conversation_ready'))
          readyFrames.push(String(event.payload))
      }),
    )
    async function profile() {
      const response = await context.request.post(
        dashboard + '/api/widget/config',
        { data: { api_key: f.key } },
      )
      assert.equal(response.status(), 200)
      return (await response.json()).profile
    }
    async function save(mode: string, routes = '') {
      console.log('Checking dashboard visibility mode:', mode)
      await admin.goto(dashboard + '/dashboard/bot/interactions')
      await admin
        .getByRole('heading', { name: f.name, exact: true })
        .click({ timeout: 60000 })
      await admin
        .getByLabel('Show the widget', { exact: true })
        .selectOption(mode)
      if (mode !== 'all')
        await admin.getByLabel('Website routes', { exact: true }).fill(routes)
      await admin
        .getByRole('button', { name: 'Save Configuration', exact: true })
        .click()
      await expect(
        admin.getByText('Bot configuration updated successfully', {
          exact: true,
        }),
      ).toBeVisible({ timeout: 30000 })
      const saved = await prisma.bots.findUniqueOrThrow({
        where: { id: f.botId },
      })
      assert.equal(saved.widgetVisibilityMode, mode)
      const publicProfile = await profile()
      assert.equal(publicProfile.widgetVisibilityMode, mode)
      assert.deepEqual(
        publicProfile.widgetVisibilityRoutes,
        saved.widgetVisibilityRoutes,
      )
      return saved
    }
    async function load(path: string, visible: boolean) {
      console.log('Checking website:', path, visible ? 'visible' : 'hidden')
      const ready = page.waitForResponse(
        (response) =>
          response.url() === dashboard + '/api/widget/config' &&
          response.request().method() === 'POST',
      )
      await page.goto(site + path)
      const configResponse = await ready
      assert.equal(configResponse.status(), 200)
      assert.deepEqual(configResponse.request().postDataJSON(), { api_key: f.key })
      const launcher = page.getByRole('button', {
        name: 'Open chat',
        exact: true,
      })
      if (visible) await expect(launcher).toBeVisible()
      else {
        // Give React a frame after the real config response to catch an accidental mount.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        )
        await expect(launcher).toHaveCount(0)
      }
      assert.equal(
        await page.evaluate(
          () =>
            'React' in window || 'ReactDOM' in window || 'process' in window,
        ),
        false,
      )
    }

    await save('all')
    await load('/about', true)
    assert.equal(
      await page
        .locator('#host-heading')
        .evaluate((el) => getComputedStyle(el).fontSize),
      '48px',
    )
    assert.equal(
      await page
        .locator('#host-button')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(255, 255, 0)',
    )
    assert.equal(
      await page
        .getByRole('button', { name: 'Open chat', exact: true })
        .evaluate((el) => getComputedStyle(el).position),
      'static',
    )
    assert.equal(
      await page
        .locator('.chat-widget-theme')
        .evaluate((el) => getComputedStyle(el).position),
      'fixed',
    )
    assert.equal(
      await page.locator('.chat-widget-theme').getAttribute('data-theme'),
      'light',
    )
    results.push(
      'Production IIFE loads from a separate origin through a head script without React/ReactDOM/process globals; CSS stays isolated.',
    )

    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await expect(
      page.getByText('Sandbox website', { exact: true }),
    ).toBeVisible()
    await expect
      .poll(() => readyFrames.length, { timeout: 30000 })
      .toBeGreaterThan(0)
    results.push(
      'Real dashboard key authentication and Docker WebSocket conversation_ready succeed.',
    )
    await page.screenshot({
      animations: 'disabled',
      path: resolve(output, 'widget-light-desktop.png'),
      fullPage: true,
    })

    await load('/about?theme=dark', true)
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    assert.equal(
      await page.locator('.chat-widget-theme').getAttribute('data-theme'),
      'dark',
    )
    assert.equal(
      await page
        .locator('.chat-widget-theme')
        .evaluate((el) => getComputedStyle(el).colorScheme),
      'dark',
    )
    await page.screenshot({
      animations: 'disabled',
      path: resolve(output, 'widget-dark-desktop.png'),
      fullPage: true,
    })
    await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(
      page.getByRole('button', { name: 'Enter fullscreen', exact: true }),
    ).toHaveCount(0)
    await expect
      .poll(async () => {
        const box = await page.getByRole('dialog').boundingBox()
        return box && Math.round(box.height)
      })
      .toBe(844)
    await page.screenshot({
      animations: 'disabled',
      path: resolve(output, 'widget-dark-mobile.png'),
      fullPage: true,
    })
    results.push(
      'Light and dark themes come from the embed; desktop and mobile render the real widget.',
    )
    await page.setViewportSize({ width: 1440, height: 1000 })

    const included = await save('include', '/pricing/\n/products/*\n/pricing')
    assert.deepEqual(included.widgetVisibilityRoutes, [
      '/pricing',
      '/products/*',
    ])
    requests.length = 0
    await load('/private', false)
    assert.equal(
      requests.some(
        (url) => url.includes('/api/auth/user/token') || url.includes('/ws/'),
      ),
      false,
    )
    await load('/pricing?campaign=test#details', true)
    await page.evaluate(() => history.pushState({}, '', '/private'))
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toHaveCount(0)
    await page.evaluate(() => history.back())
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => history.forward())
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toHaveCount(0)
    await page.evaluate(() => history.pushState({}, '', '/products/course'))
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => history.replaceState({}, '', '/products-old'))
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toHaveCount(0)
    await load('/products', true)
    await load('/products/course/', true)
    await load('/Pricing', false)
    results.push(
      'Dashboard include mode saves canonical routes; exact/wildcard matches, query/fragment handling, case and prefix boundaries work. Hidden pages never authenticate chat.',
    )
    results.push(
      'pushState, replaceState, and browser back/forward update visibility without reloading.',
    )

    await save('exclude', '/admin\n/checkout/*')
    await load('/admin', false)
    await load('/checkout', false)
    await load('/checkout/payment', false)
    await load('/about', true)
    results.push(
      'Dashboard exclude mode hides only the listed routes and their configured subtrees.',
    )

    await admin.goto(dashboard + '/dashboard/bot/interactions')
    await admin.getByRole('heading', { name: f.name, exact: true }).click()
    await admin
      .getByLabel('Show the widget', { exact: true })
      .selectOption('include')
    await admin
      .getByLabel('Website routes', { exact: true })
      .fill('https://invalid.example/path')
    await admin
      .getByRole('button', { name: 'Save Configuration', exact: true })
      .click()
    await expect(admin.getByText(/Use a path such as \/pricing/)).toBeVisible()
    assert.equal((await profile()).widgetVisibilityMode, 'exclude')
    results.push(
      'Invalid route configuration is rejected without changing saved settings.',
    )

    const all = await save('all')
    assert.deepEqual(all.widgetVisibilityRoutes, [])
    await load('/private?installation=manual&theme=dark', true)
    assert.equal(
      await page.locator('.chat-widget-theme').getAttribute('data-theme'),
      'dark',
    )
    await load('/private?installation=alias&theme=light', true)
    assert.equal(
      await page.locator('.chat-widget-theme').getAttribute('data-theme'),
      'light',
    )
    await page.evaluate(
      (config) => {
        const w = window as unknown as Window & {
          injectChat: (input: unknown) => { destroy: () => void }
        }
        w.injectChat(config)
        w.injectChat(config)
      },
      { api_key: f.key, theme: 'dark' },
    )
    await expect(page.locator('#chat-widget-interface')).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toBeVisible()
    results.push(
      'All-routes mode clears restrictions; manual injectChat, legacy chatInject and repeated initialization work with one widget.',
    )

    await page.route(dashboard + '/api/widget/config', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    )
    await page.reload()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await expect(
      page.getByRole('button', { name: 'Open chat', exact: true }),
    ).toHaveCount(0)
    await page.unroute(dashboard + '/api/widget/config')
    results.push(
      'Configuration failure keeps the widget hidden instead of bypassing route settings.',
    )

    await admin.goto(dashboard + '/dashboard/bot/api')
    await admin
      .getByLabel('Published widget script URL', { exact: true })
      .fill(bundleUrl)
    await admin.getByLabel('Widget theme', { exact: true }).selectOption('dark')
    await admin
      .getByLabel('Widget API key for this bot', { exact: true })
      .fill(f.key)
    await expect(
      admin.getByRole('button', { name: 'Copy embed code', exact: true }),
    ).toBeEnabled()
    assert.match(await admin.locator('pre').innerText(), /data-theme="dark"/)
    results.push(
      'Dashboard embed panel generates a complete script containing the API key and theme.',
    )
    assert.deepEqual(errors, [], 'No browser runtime errors')
    await writeFile(
      resolve(output, 'results.json'),
      JSON.stringify(
        { checkedAt: new Date().toISOString(), results, browserErrors: errors },
        null,
        2,
      ),
    )
    for (const result of results) console.log('PASS:', result)
    console.log('Screenshots and results:', output)
  } catch (error) {
    for (const page of browser
      .contexts()
      .flatMap((context) => context.pages())) {
      await page
        .screenshot({
          animations: 'disabled',
          path: resolve(
            output,
            `failure-${page.url().includes(':4000') ? 'dashboard' : 'website'}.png`,
          ),
          fullPage: true,
        })
        .catch(() => {})
    }
    throw error
  } finally {
    await browser.close()
    await Promise.all([
      new Promise<void>((resolve) => host.close(() => resolve())),
      new Promise<void>((resolve) => assets.close(() => resolve())),
    ])
    await prisma.$disconnect()
  }
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Widget test failed')
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
