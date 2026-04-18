import { schema } from '../../editor/core/schema'
import { Node, DOMParser as PMDOMParser } from 'prosemirror-model'
import MarkdownIt from 'markdown-it'
import { processTaskLists } from './markdown/taskListProcessor'
import { serializer } from './markdown/markdownSerializer'

const md = MarkdownIt({ html: true, linkify: false, typographer: false })
const mdWithBreaks = MarkdownIt({ html: true, linkify: false, typographer: false, breaks: true })
md.enable('strikethrough')
mdWithBreaks.enable('strikethrough')

// Usamos `before('link')` para dar prioridade e garantir que nosso wiki-link 
// seja reconhecido mesmo se estiver cercado por outros textos no meio de parágrafos/listas.
function setupWikiRule(parser: MarkdownIt) {
  parser.inline.ruler.before('link', 'wiki_link', (state, silent) => {
    const start = state.pos
    if (state.src.charCodeAt(start) !== 0x5B /* [ */ || state.src.charCodeAt(start + 1) !== 0x5B /* [ */) {
      return false
    }
    const end = state.src.indexOf(']]', start + 2)
    if (end === -1) return false

    if (!silent) {
      const target = state.src.slice(start + 2, end)
      const token = state.push('wiki_link', 'span', 0)
      token.attrs = [['data-wiki-link', target], ['data-wiki-label', target]]
      token.content = `[[${target}]]`
    }

    state.pos = end + 2
    return true
  })

  parser.renderer.rules.wiki_link = (tokens, idx) => {
    const token = tokens[idx]
    const target = token.attrGet('data-wiki-link') || ''
    const label = token.attrGet('data-wiki-label') || ''
    return `<span data-wiki-link="${target}" data-wiki-label="${label}">[[${label}]]</span>`
  }
}

setupWikiRule(md)
setupWikiRule(mdWithBreaks)

export interface MarkdownToDocOptions {
  preserveSoftBreaks?: boolean
  lineMode?: 'markdown' | 'plain-lines'
}

export const MarkdownConverter = {
  toDoc(markdown: string, options?: MarkdownToDocOptions): Node {
    if (options?.lineMode === 'plain-lines') {
      const lines = markdown.replace(/\r\n/g, '\n').split('\n')
      const blocks = lines.map((line) => {
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
        if (headingMatch) {
          const level = Math.max(1, Math.min(6, headingMatch[1].length))
          const text = headingMatch[2] ?? ''
          return schema.nodes.heading.create(
            { level },
            text ? schema.text(text) : undefined
          )
        }
        return schema.nodes.paragraph.create(null, line ? schema.text(line) : undefined)
      })

      return schema.topNodeType.createAndFill(null, blocks) ?? schema.topNodeType.createAndFill()!
    }

    const parser = options?.preserveSoftBreaks ? mdWithBreaks : md
    const html = parser.render(markdown)
    const container = document.createElement('div')
    container.innerHTML = html
    processTaskLists(container)
    try {
      return PMDOMParser.fromSchema(schema).parse(container)
    } catch (err) {
      console.error('[MarkdownConverter.toDoc] Erro:', err)
      return schema.topNodeType.createAndFill()!
    }
  },

  fromDoc(doc: Node, options?: { lineMode?: 'markdown' | 'plain-lines' }): string {
    if (options?.lineMode === 'plain-lines') {
      const lines: string[] = []
      doc.forEach((node) => {
        if (node.type.name === 'heading') {
          const level = Math.max(1, Math.min(6, Number(node.attrs.level) || 1))
          lines.push(`${'#'.repeat(level)} ${node.textContent}`)
          return
        }

        if (node.type.name === 'paragraph') {
          lines.push(node.textContent)
          return
        }

        if (node.type.name === 'horizontal_rule') {
          lines.push('---')
          return
        }

        if (node.type.name === 'code_block') {
          const language = (node.attrs.language as string) || (node.attrs.params as string) || ''
          lines.push(`\`\`\`${language}`)
          const content = node.textContent.replace(/\r\n/g, '\n')
          lines.push(...content.split('\n'))
          lines.push('```')
          return
        }

        lines.push(node.textContent)
      })
      return lines.join('\n')
    }

    try {
      return serializer.serialize(doc)
    } catch (err) {
      console.error('[MarkdownConverter.fromDoc] Erro:', err)
      return doc.textContent
    }
  }
}
