export function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const lines = escaped.split('\n')
  const out: string[] = []
  let inList = false
  for (const line of lines) {
    const h1 = /^# (.+)/.exec(line)
    const h2 = /^## (.+)/.exec(line)
    const h3 = /^### (.+)/.exec(line)
    const li = /^- (.+)/.exec(line)
    if (li) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(li[1])}</li>`)
      continue
    }
    if (inList) {
      out.push('</ul>')
      inList = false
    }
    if (h1) out.push(`<h1>${inline(h1[1])}</h1>`)
    else if (h2) out.push(`<h2>${inline(h2[1])}</h2>`)
    else if (h3) out.push(`<h3>${inline(h3[1])}</h3>`)
    else if (line.trim() === '---') out.push('<hr />')
    else if (line.trim() === '') out.push('')
    else out.push(`<p>${inline(line)}</p>`)
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
}
