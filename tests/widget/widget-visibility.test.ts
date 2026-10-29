import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseVisibilityRoutes, isWidgetVisible } from '../../lib/widget/widget-visibility'
import { widgetSettingsSchema } from '../../lib/widget/widget-profile'
import { buildWidgetEmbed } from '../../lib/widget/widget-embed'
import { getDocPage } from '../../lib/docs/docs'

test('dashboard stores canonical paths with the same matching contract as the widget', () => {
  const routes = parseVisibilityRoutes(' /pricing/ \n/products/*\n/pricing')
  assert.deepEqual(routes, ['/pricing', '/products/*'])
  for (const mode of ['include', 'exclude'] as const) {
    assert.equal(
      isWidgetVisible('/products/a', {
        widgetVisibilityMode: mode,
        widgetVisibilityRoutes: routes,
      }),
      mode === 'include',
    )
    assert.equal(
      isWidgetVisible('/products-old', {
        widgetVisibilityMode: mode,
        widgetVisibilityRoutes: routes,
      }),
      mode === 'exclude',
    )
  }
  for (const route of [
    '/foo?x=1',
    '//host',
    '/foo/**',
    '/foo/../bar',
    '/foo#bar',
  ])
    assert.throws(() => parseVisibilityRoutes(route))
})

test('settings reject invalid visibility modes and patterns', () => {
  const settings = {
    avatar_url: '',
    support_email: '',
    support_team_name: '',
    human_reply_minutes: '',
    support_hours: '',
    help_center_url: '',
  }
  assert.equal(widgetSettingsSchema.safeParse(settings).success, true)
  assert.equal(
    widgetSettingsSchema.safeParse({
      ...settings,
      widget_visibility_mode: 'both',
    }).success,
    false,
  )
  assert.equal(
    widgetSettingsSchema.safeParse({
      ...settings,
      widget_visibility_routes: 'https://example.com',
    }).success,
    false,
  )
})

test('embed code contains key and selected theme and safely escapes attributes', () => {
  const code = buildWidgetEmbed({
    url: 'https://cdn.example/widget.js',
    apiKey: 'key"<script>',
    theme: 'dark',
  })
  assert.match(code, /data-theme="dark"/)
  assert.equal(code.includes('data-bot-id'), false)
  assert.match(code, /key&amp;|key&quot;&lt;script&gt;/)
  assert.equal(code.includes('key"<script>'), false)
})


test('installation docs share the dashboard snippet and separate manual initialization', () => {
  const docs = getDocPage('website-embedding')
  assert.ok(docs)
  const automatic = docs.sections.find(section => section.id === 'current-embed-template')
  const manual = docs.sections.find(section => section.id === 'manual-widget-initialization')
  assert.equal(automatic?.code, buildWidgetEmbed({ url: 'YOUR_PUBLISHED_WIDGET_SCRIPT_URL', apiKey: 'YOUR_BOT_WIDGET_KEY', theme: 'light' }))
  assert.equal((automatic?.code?.match(/<script/g) ?? []).length, 1)
  assert.match(manual?.code ?? '', /onload="window.injectChat/)
  assert.equal(manual?.code?.includes('data-api-key'), false)
  assert.ok(docs.sections.some(section => section.id === 'widget-route-visibility'))
})
