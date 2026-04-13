import { useEffect, useCallback } from 'react'
import { EditorView } from 'prosemirror-view'
import { setBlockType } from 'prosemirror-commands'
import { useEditorStore } from '../../../store/editorStore'
import { schema } from '../../core/schema'

/**
 * Gerencia o Format Painter (pincel de formatação).
 *
 * Captura:
 *  - Marks inline (bold, italic, underline, etc.)
 *  - Tipo do bloco pai (heading com level, paragraph, code_block)
 *
 * Aplica tudo ao texto selecionado pelo usuário.
 */
export function useFormatPainter(
  containerRef: React.RefObject<HTMLElement>,
  viewRef: React.RefObject<EditorView | null>
) {
  const { formatPainter, setFormatPainter } = useEditorStore()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!formatPainter?.active) {
      container.classList.remove('format-painter-active')
      return
    }

    container.classList.add('format-painter-active')

    const applyOnMouseUp = () => {
      const view = viewRef.current
      if (!view || !formatPainter?.active) return

      const { from, to, empty } = view.state.selection
      if (empty) return

      let tr = view.state.tr

      // 1. Aplica marks inline
      Object.values(schema.marks).forEach(mt => tr.removeMark(from, to, mt))
      formatPainter.marks.forEach(({ type, attrs }) => {
        const mt = schema.marks[type]
        if (mt) tr.addMark(from, to, mt.create(attrs))
      })
      view.dispatch(tr)

      // 2. Aplica tipo de bloco (heading, paragraph, code_block)
      if (formatPainter.blockType) {
        const { name, attrs } = formatPainter.blockType
        const nodeType = schema.nodes[name]
        if (nodeType) {
          setBlockType(nodeType, attrs as Record<string, unknown>)(view.state, view.dispatch)
        }
      }

      setFormatPainter(null)
    }

    container.addEventListener('mouseup', applyOnMouseUp)
    return () => {
      container.removeEventListener('mouseup', applyOnMouseUp)
      container.classList.remove('format-painter-active')
    }
  }, [formatPainter, setFormatPainter, containerRef, viewRef])

  const captureFormat = useCallback(() => {
    const view = viewRef.current
    if (!view) return

    if (formatPainter?.active) {
      setFormatPainter(null)
      return
    }

    const { from, to, empty, $from } = view.state.selection
    const marks: Array<{ type: string; attrs: Record<string, unknown> }> = []

    if (empty) {
      const stored = view.state.storedMarks ?? $from.marks()
      stored.forEach(m => marks.push({ type: m.type.name, attrs: m.attrs as Record<string, unknown> }))
    } else {
      view.state.doc.nodesBetween(from, to, node => {
        node.marks.forEach(m => {
          if (!marks.find(x => x.type === m.type.name)) {
            marks.push({ type: m.type.name, attrs: m.attrs as Record<string, unknown> })
          }
        })
      })
    }

    // Captura o tipo do bloco pai (heading level, paragraph, code_block)
    const parent = $from.parent
    const blockType = { name: parent.type.name, attrs: parent.attrs as Record<string, unknown> }

    setFormatPainter({ active: true, marks, blockType })
  }, [formatPainter, setFormatPainter, viewRef])

  return { captureFormat, isActive: !!formatPainter?.active }
}
