/**
 * Utilitários para YAML frontmatter minimalista.
 * Suporta: strings, números, booleanos e arrays simples.
 * Não suporta: objetos aninhados (não são necessários para tags/metadados simples).
 */

export interface Frontmatter {
  tags?: string[]
  [key: string]: unknown
}

/**
 * Extrai o frontmatter YAML do início do conteúdo markdown.
 * Retorna o objeto de metadados e o corpo sem o bloco `---`.
 */
export function parseFrontmatter(content: string): { meta: Frontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { meta: {}, body: content }

  const meta: Frontmatter = {}
  const raw = match[1]

  for (const line of raw.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (!key) continue

    // Array inline: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else if (val === 'true') {
      meta[key] = true
    } else if (val === 'false') {
      meta[key] = false
    } else if (val !== '' && !isNaN(Number(val))) {
      meta[key] = Number(val)
    } else {
      meta[key] = val.replace(/^['"]|['"]$/g, '')
    }
  }

  return { meta, body: content.slice(match[0].length) }
}

/**
 * Serializa metadados de volta para bloco `---` no início do markdown.
 * Se meta estiver vazio, retorna apenas o body.
 */
export function serializeFrontmatter(meta: Frontmatter, body: string): string {
  const entries = Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return body

  const lines = entries.map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
    return `${k}: ${String(v)}`
  })

  return `---\n${lines.join('\n')}\n---\n${body}`
}
