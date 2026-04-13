import { Plugin } from 'prosemirror-state'
import { DecorationSet, Decoration } from 'prosemirror-view'

/**
 * BUG FIX: Placeholder agora some corretamente quando há qualquer conteúdo
 */
export function placeholderPlugin(text = 'Comece a escrever...') {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc } = state
        
        // Só mostra placeholder se:
        // 1. Doc tem apenas um nó filho
        // 2. Esse nó é um textblock
        // 3. Esse nó está completamente vazio
        if (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0 &&
          doc.firstChild.nodeSize === 2 // Apenas tags de abertura/fechamento
        ) {
          return DecorationSet.create(doc, [
            Decoration.node(0, doc.firstChild.nodeSize, {
              class: 'pm-placeholder',
              'data-placeholder': text
            })
          ])
        }
        
        return DecorationSet.empty
      }
    }
  })
}
