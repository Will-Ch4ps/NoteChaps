import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'

export interface FindState {
  query: string
  caseSensitive: boolean
  currentMatch: number
  matches: Array<{ from: number; to: number }>
}

export const findPluginKey = new PluginKey<FindState>('find')

function findMatches(doc: PMNode, query: string, caseSensitive: boolean) {
  const matches: Array<{ from: number; to: number }> = []
  if (!query) return matches

  const searchStr = caseSensitive ? query : query.toLowerCase()
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (!node.isText || !node.text) return
    const text = caseSensitive ? node.text : node.text.toLowerCase()
    let idx = 0
    while ((idx = text.indexOf(searchStr, idx)) !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + searchStr.length })
      idx += searchStr.length
    }
  })
  return matches
}

export const findPlugin = new Plugin<FindState>({
  key: findPluginKey,
  state: {
    init: () => ({ query: '', caseSensitive: false, currentMatch: 0, matches: [] }),
    apply(tr, prev, _oldState, newState) {
      const meta = tr.getMeta(findPluginKey)
      if (meta !== undefined) {
        const next = { ...prev, ...meta }
        next.matches = findMatches(newState.doc, next.query, next.caseSensitive)
        if (next.currentMatch >= next.matches.length) next.currentMatch = 0
        return next
      }
      if (tr.docChanged) {
        const matches = findMatches(newState.doc, prev.query, prev.caseSensitive)
        return { ...prev, matches }
      }
      return prev
    }
  },
  props: {
    decorations(state) {
      const { query, matches, currentMatch } = findPluginKey.getState(state)!
      if (!query || matches.length === 0) return DecorationSet.empty

      const decos = matches.map((m, i) =>
        Decoration.inline(m.from, m.to, {
          class: i === currentMatch ? 'find-match find-match-current' : 'find-match'
        })
      )
      return DecorationSet.create(state.doc, decos)
    }
  }
})
