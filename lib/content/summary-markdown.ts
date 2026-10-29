const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' })
const markdownBlock = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|`{3}|~{3}|\|)/m

// Existing prose stays factual: only add bullet markers and line breaks.
// Stored Markdown is left intact, including its headings and nested lists.
export function prepareSummaryMarkdown(source: string) {
  const text = source.replace(/\r\n/g, '\n').trim()
  if (!text || markdownBlock.test(text)) return text
  return text.split(/\n\s*\n/).map(paragraph => {
    const sentences: string[] = []
    for (const item of paragraph.split('\n').flatMap(line => Array.from(sentenceSegmenter.segment(line)))) {
      const sentence = item.segment.trim()
      if (!sentence) continue
      const previous = sentences.at(-1)
      // Keep a name's initials and common titles with the following words.
      if (previous && /\b(?:[A-Z]|Dr|Mr|Ms|Mrs|Prof)\.$/.test(previous)) {
        sentences[sentences.length - 1] = `${previous} ${sentence}`
      } else sentences.push(sentence)
    }
    return sentences.map(sentence => `- ${sentence}`).join('\n')
  }).join('\n\n')
}
