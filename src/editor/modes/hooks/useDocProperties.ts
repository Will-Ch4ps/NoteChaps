import { useCallback } from 'react'
import { EditorState } from 'prosemirror-state'
import { useEditorStore } from '../../../store/editorStore'
import { countWords } from '../../../shared/utils'
import { HeadingEntry } from '../../../shared/types'

/** Extrai e publica contagem de palavras, headings e linhas do documento. */
export function useDocProperties() {
  const { setDocProperties } = useEditorStore()

  return useCallback((state: EditorState) => {
    const text = state.doc.textContent
    const headings: HeadingEntry[] = []
    let lineCount = 0

    state.doc.forEach((node, offset) => {
      lineCount++
      if (node.type.name === 'heading') {
        headings.push({ level: node.attrs.level, text: node.textContent, pos: offset })
      }
    })

    setDocProperties({ wordCount: countWords(text), charCount: text.length, lineCount, headings })
  }, [setDocProperties])
}
