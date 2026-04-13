import { useCallback } from 'react'
import { EditorView } from 'prosemirror-view'

/** Cola texto sem nenhuma formatação (plain text). */
export function usePastePlain(viewRef: React.RefObject<EditorView | null>) {
  return useCallback(async () => {
    const view = viewRef.current
    if (!view) return
    try {
      const text = await navigator.clipboard.readText()
      const { state, dispatch } = view
      dispatch(state.tr.insertText(text, state.selection.from, state.selection.to))
      view.focus()
    } catch {
      console.warn('[PastePlain] Clipboard API indisponível')
    }
  }, [viewRef])
}
