import { Plugin, PluginKey } from 'prosemirror-state'

export interface SlashState {
  active: boolean
  query: string
  from: number  // posição do '/' no doc
  to: number
}

export const slashPluginKey = new PluginKey<SlashState | null>('slashCommand')

export function createSlashCommandPlugin(): Plugin {
  return new Plugin<SlashState | null>({
    key: slashPluginKey,
    state: {
      init: () => null,
      apply(tr, prev) {
        const meta = tr.getMeta(slashPluginKey)
        if (meta !== undefined) return meta
        // Se o doc mudou, recalcula
        if (!tr.docChanged) return prev
        return null
      }
    },
    view() {
      return {
        update(view) {
          const { $from, empty } = view.state.selection
          if (!empty || !$from.parent.isTextblock) {
            const current = slashPluginKey.getState(view.state)
            if (current?.active) {
              view.dispatch(view.state.tr.setMeta(slashPluginKey, null))
            }
            return
          }

          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
          const match = textBefore.match(/\/([a-zA-Z0-9\-]*)$/)

          if (match) {
            const slashPos = $from.pos - match[0].length
            view.dispatch(
              view.state.tr.setMeta(slashPluginKey, {
                active: true,
                query: match[1],
                from: slashPos,
                to: $from.pos
              })
            )
          } else {
            const current = slashPluginKey.getState(view.state)
            if (current?.active) {
              view.dispatch(view.state.tr.setMeta(slashPluginKey, null))
            }
          }
        }
      }
    }
  })
}
