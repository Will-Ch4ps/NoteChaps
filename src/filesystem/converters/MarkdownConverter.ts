import { schema } from '../../editor/core/schema'
import { Node, DOMParser as PMDOMParser } from 'prosemirror-model'
import MarkdownIt from 'markdown-it'
import { processTaskLists } from './markdown/taskListProcessor'
import { serializer } from './markdown/markdownSerializer'

const md = MarkdownIt({ html: true, linkify: false, typographer: false })
md.enable('strikethrough')

// Usamos `before('link')` para dar prioridade e garantir que nosso wiki-link 
// seja reconhecido mesmo se estiver cercado por outros textos no meio de parágrafos/listas.
md.inline.ruler.before('link', 'wiki_link', (state, silent) => {
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

md.renderer.rules.wiki_link = (tokens, idx) => {
  const token = tokens[idx]
  const target = token.attrGet('data-wiki-link') || ''
  const label = token.attrGet('data-wiki-label') || ''
  return `<span data-wiki-link="${target}" data-wiki-label="${label}">[[${label}]]</span>`
}

export const MarkdownConverter = {
  toDoc(markdown: string): Node {
    const html = md.render(markdown)
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

  fromDoc(doc: Node): string {
    try {
      return serializer.serialize(doc)
    } catch (err) {
      console.error('[MarkdownConverter.fromDoc] Erro:', err)
      return doc.textContent
    }
  }
}