import DOMPurify from 'isomorphic-dompurify'
import { Marked } from 'marked'

const markdown = new Marked({
  breaks: true,
  gfm: true,
})

function normalizeDefinitionLists(source: string) {
  return source.replace(
    /^([^\n]+)\n: ([^\n]+)(?=\n|$)/gm,
    '<dl><dt>$1</dt><dd>$2</dd></dl>',
  )
}

function openExternalLinksInNewTab(html: string) {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    const href = attributes.match(/\bhref=(["'])(.*?)\1/i)?.[2]
    if (!href || href.startsWith('#')) return tag

    const cleanAttributes = attributes
      .replace(/\s+target=(["']).*?\1/gi, '')
      .replace(/\s+rel=(["']).*?\1/gi, '')

    return `<a${cleanAttributes} target="_blank" rel="noopener noreferrer">`
  })
}

export function renderChatMarkdown(source: string) {
  const normalized = normalizeDefinitionLists(source)
  const rendered = markdown.parse(normalized, { async: false })
  const renderedHtml = typeof rendered === 'string' ? rendered : ''
  const sanitizedHtml = DOMPurify.sanitize(
    renderedHtml
      .replaceAll('<table>', '<div class="chat-table-wrap"><table>')
      .replaceAll('</table>', '</table></div>'),
  )

  return openExternalLinksInNewTab(sanitizedHtml)
}
