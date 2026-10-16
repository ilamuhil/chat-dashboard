import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepareSummaryMarkdown } from './summary-markdown.ts'
import { renderMarkdown } from './markdown.ts'

test('legacy prose becomes separate bullets without dropping facts or contact details', () => {
  const text = 'Maya wants online classes. Her budget is INR 65,000. Do not contact maya@example.invalid.'
  const formatted = prepareSummaryMarkdown(text)
  assert.equal(formatted, '- Maya wants online classes.\n- Her budget is INR 65,000.\n- Do not contact maya@example.invalid.')
  assert.equal(formatted.replace(/^- /gm, '').replace(/\n/g, ' '), text)
})

test('structured Markdown and nested lists are preserved exactly', () => {
  const text = '## Current profile\n\n- **Course:** Full Stack\n  - Online\n\n## Contact\n\n- Consent withdrawn.'
  assert.equal(prepareSummaryMarkdown(text), text)
  const html = renderMarkdown(text, { allowMedia: false })
  assert.match(html, /<h2>Current profile<\/h2>/)
  assert.match(html, /<strong>Course:<\/strong>/)
  assert.match(html, /<ul>/)
})

test('empty text is safe and separate legacy paragraphs remain separate lists', () => {
  assert.equal(prepareSummaryMarkdown('  '), '')
  assert.equal(prepareSummaryMarkdown('First fact.\n\nSecond fact.'), '- First fact.\n\n- Second fact.')
})

test('summary Markdown strips executable HTML and media but retains safe text and links', () => {
  const html = renderMarkdown('## Notes\n<script>alert(1)</script>\n<img src="https://example.invalid/track" onerror="alert(1)">\n\n[unsafe](javascript:alert(1))\n[safe](https://example.com)', { allowMedia: false })
  assert.doesNotMatch(html, /<script|<img|onerror|href="javascript:/i)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.match(html, /rel="noopener noreferrer"/)
})


test('legacy names, initials, marks and contact addresses stay together', () => {
  const text = 'Dr. Maya R. Rao scored 78.5%. Contact maya@example.invalid only with consent.'
  assert.equal(prepareSummaryMarkdown(text), '- Dr. Maya R. Rao scored 78.5%.\n- Contact maya@example.invalid only with consent.')
})


test('older summaries with one field per line retain those separate facts', () => {
  assert.equal(prepareSummaryMarkdown('Course: Full Stack\nMode: Online\nConsent: Not given'), '- Course: Full Stack\n- Mode: Online\n- Consent: Not given')
})
