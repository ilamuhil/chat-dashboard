// RFC 4180 quoting plus spreadsheet-formula neutralization for untrusted text.
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
    text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
export function toCsv(headers: string[], rows: unknown[][]): string {
  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  )
}
