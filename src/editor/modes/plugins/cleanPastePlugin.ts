import { Plugin } from 'prosemirror-state'

/**
 * Intercepta paste com HTML e insere apenas texto puro.
 * Resolve o problema de <span style="color:rgb(...)"> aparecer como texto literal.
 */
export function createCleanPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const data = event.clipboardData
        if (!data) return false

        const html = data.getData('text/html')
        const plain = data.getData('text/plain')

        if (!html || !plain) return false

        event.preventDefault()

        const paragraphs = plain.split(/\n\n+/)
        const { state, dispatch } = view
        let tr = state.tr

        paragraphs.forEach((para, pi) => {
          if (pi > 0) {
            const pos = tr.mapping.map(state.selection.to)
            tr = tr.split(pos)
          }
          const lines = para.split('\n')
          lines.forEach((line, li) => {
            if (li > 0) {
              const pos = tr.mapping.map(state.selection.to)
              tr = tr.split(pos)
            }
            if (line.trim()) {
              const pos = tr.mapping.map(state.selection.to)
              tr = tr.insertText(line, pos)
            }
          })
        })

        dispatch(tr)
        return true
      }
    }
  })
}
