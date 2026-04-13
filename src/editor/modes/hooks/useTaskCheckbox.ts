import { useEffect } from 'react'
import { EditorView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'

/**
 * Captura cliques no <input type="checkbox"> dentro de task_items
 * e atualiza o atributo `checked` via transaction do ProseMirror.
 */
export function useTaskCheckbox(
  containerRef: React.RefObject<HTMLElement>,
  viewRef: React.RefObject<EditorView | null>
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains('task-checkbox')) return

      const view = viewRef.current
      if (!view) return

      const li = target.closest('li[data-type="task_item"]')
      if (!li) return

      e.preventDefault()

      try {
        const domPos = view.posAtDOM(li, 0)
        const $pos = view.state.doc.resolve(domPos)

        let taskPos = -1
        let taskNode: PMNode | null = null

        for (let d = $pos.depth; d >= 0; d--) {
          const n = $pos.node(d)
          if (n.type.name === 'task_item') {
            taskPos = $pos.before(d)
            taskNode = n
            break
          }
        }

        if (taskPos === -1) {
          const direct = view.state.doc.nodeAt(domPos)
          if (direct?.type.name === 'task_item') {
            taskPos = domPos
            taskNode = direct
          }
        }

        if (taskNode && taskPos >= 0) {
          const tr = view.state.tr.setNodeMarkup(taskPos, null, {
            ...taskNode.attrs,
            checked: !taskNode.attrs.checked
          })
          view.dispatch(tr)
        }
      } catch (err) {
        console.warn('[TaskCheckbox] Erro ao toggle:', err)
      }
    }

    container.addEventListener('mousedown', handleMouseDown, true)
    return () => container.removeEventListener('mousedown', handleMouseDown, true)
  }, [containerRef, viewRef])
}
