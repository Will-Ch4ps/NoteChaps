import { Plugin } from 'prosemirror-state'
import { schema } from '../../core/schema'

/**
 * Plugin de criação e navegação de wiki_link.
 *
 * - Digitar [[nome]] → cria nó wiki_link com texto [[nome]] editável
 * - Ctrl+Clique → navega para o arquivo via onNavigate()
 * - Backspace/setas funcionam normalmente dentro do nó (atom: false)
 */
export function createWikiLinkPlugin(onNavigate: (target: string) => void): Plugin {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== ']') return false

        const $from = view.state.doc.resolve(from)
        const textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - 60),
          $from.parentOffset
        )

        const match = textBefore.match(/\[\[([^\][\n]+)\]$/)
        if (!match) return false

        const target = match[1].trim()
        if (!target) return false

        const startOffset = $from.parentOffset - match[0].length
        const nodeStart = $from.start() + startOffset
        const nodeEnd = to + 1

        // Cria o nó com texto editável [[target]] como conteúdo
        const textContent = schema.text(`[[${target}]]`)
        const wikiNode = schema.nodes.wiki_link.create({ target, label: target }, textContent)
        view.dispatch(view.state.tr.replaceWith(nodeStart, nodeEnd, wikiNode))
        return true
      },

      handleDOMEvents: {
        click(view, event) {
          if (!event.ctrlKey && !event.metaKey) return false

          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (!coords) return false

          const $pos = view.state.doc.resolve(coords.pos)
          // Verifica se o clique foi dentro de um nó wiki_link
          for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d)
            if (node.type === schema.nodes.wiki_link) {
              event.preventDefault()
              // Extrai o target do texto do nó (ex: "[[referência]]" → "referência")
              const text = node.textContent
              const inner = text.match(/^\[\[(.+)\]\]$/)
              const target = inner ? inner[1] : (node.attrs.target as string)
              onNavigate(target)
              return true
            }
          }
          return false
        }
      }
    }
  })
}
