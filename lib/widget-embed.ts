function attribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function buildWidgetEmbed({
  url,
  apiKey,
  theme,
}: {
  url: string
  apiKey: string
  theme: 'light' | 'dark'
}) {
  return `<script\n  src="${attribute(url)}"\n  data-api-key="${attribute(apiKey)}"\n  data-theme="${theme}"\n  async\n></script>`
}
