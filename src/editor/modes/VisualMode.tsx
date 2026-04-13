import { useEffect, useRef, useState } from 'react'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { useTabsStore } from '../../store/tabsStore'
import { useEditorStore } from '../../store/editorStore'

import { CodeBlockView } from './nodeViews/CodeBlockView'
import { DiagramView } from './nodeViews/DiagramView'
import { TableView } from './nodeViews/TableView'
import { WikiLinkNodeView } from './nodeViews/WikiLinkNodeView'
import { createCleanPastePlugin } from './plugins/cleanPastePlugin'
import { useTaskCheckbox } from './hooks/useTaskCheckbox'
import { useWikiNavigation } from './hooks/useWikiNavigation'
import { useFormatPainter } from './hooks/useFormatPainter'
import { useDocProperties } from './hooks/useDocProperties'
import { WikiLinkSuggestions } from './components/WikiLinkSuggestions'
import { SlashMenu } from '../../app/layout/SlashMenu'
import { slashPluginKey, SlashState } from './plugins/slashCommandPlugin'
import { countWords } from '../../shared/utils'

interface VisualModeProps {
  tabId: string
  initialState: EditorState
}

interface WikiSuggestState {
  active: boolean
  query: string
  from: number
  to: number
}

export function VisualMode({ tabId, initialState }: VisualModeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const [wikiSuggest, setWikiSuggest] = useState<WikiSuggestState | null>(null)
  const [slashMenuState, setSlashMenuState] = useState<SlashState | null>(null)

  const { updateEditorState, markDirty } = useTabsStore()
  const { setActiveView, setSelectionProperties } = useEditorStore()

  const updateDocProps = useDocProperties()
  const handleWikiClick = useWikiNavigation()

  useFormatPainter(containerRef, viewRef)
  useTaskCheckbox(containerRef, viewRef)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const plugins = [...initialState.plugins, createCleanPastePlugin()]
    const state = initialState.reconfigure({ plugins })

    viewRef.current = new EditorView(container, {
      state,
      nodeViews: {
        code_block(node, view, getPos) {
          const lang = (node.attrs.language as string) || (node.attrs.params as string) || ''
          if (lang === 'mermaid') return new DiagramView(node, view, getPos as () => number | undefined)
          return new CodeBlockView(node)
        },
        table(node, view, getPos) {
          return new TableView(node, view, getPos as () => number | undefined)
        },
        wiki_link(node, view, getPos) {
          return new WikiLinkNodeView(node, view, getPos, handleWikiClick)
        }
      },
      handleDOMEvents: {
        keydown(view, event) {
          if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
            event.preventDefault()
            const { $from } = view.state.selection
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
            const match = textBefore.match(/\[\[([^\]\n]*)$/)

            if (match) {
              setWikiSuggest({
                active: true,
                query: match[1],
                from: $from.pos - match[0].length,
                to: $from.pos
              })
            } else {
              view.dispatch(view.state.tr.insertText('[['))
            }
            return true
          }
          return false
        }
      },
      dispatchTransaction: (tr) => {
        const view = viewRef.current
        if (!view) return

        const next = view.state.apply(tr)
        view.updateState(next)
        updateEditorState(tabId, next)

        if (tr.docChanged) {
          markDirty(tabId, true)
          updateDocProps(next)
        }

        // Atualiza slash menu state
        const slash = slashPluginKey.getState(next)
        setSlashMenuState(slash ?? null)

        const { $from, empty: isSelectionEmpty } = next.selection
        if (isSelectionEmpty && $from.parent.isTextblock) {
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
          const match = textBefore.match(/\[\[([^\]\n]*)$/)
          if (match) {
            setWikiSuggest({
              active: true,
              query: match[1],
              from: $from.pos - match[0].length,
              to: $from.pos
            })
          } else {
            setWikiSuggest(null)
          }
        } else {
          setWikiSuggest(null)
        }

        const { from, to, empty } = next.selection
        if (!empty) {
          const text = next.doc.textBetween(from, to, ' ')
          const parent = next.selection.$from.parent
          setSelectionProperties({
            wordCount: countWords(text),
            nodeType: parent.type.name,
            marks: parent.marks.map(m => m.type.name)
          })
        } else {
          setSelectionProperties(null)
        }
      }
    })

    viewRef.current.dom.setAttribute('spellcheck', 'true')
    updateDocProps(state)
    setActiveView(viewRef.current)

    return () => {
      setActiveView(null)
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  return (
    <>
      <div
        ref={containerRef}
        className="prosemirror-container"
        style={{ outline: 'none', height: '100%', minHeight: '100%', backgroundColor: '#ffffff', position: 'relative', display: 'block' }}
      />
      {wikiSuggest?.active && viewRef.current && (
        <WikiLinkSuggestions
          view={viewRef.current}
          from={wikiSuggest.from}
          to={wikiSuggest.to}
          query={wikiSuggest.query}
          onClose={() => setWikiSuggest(null)}
        />
      )}
      {slashMenuState?.active && viewRef.current && (
        <SlashMenu
          view={viewRef.current}
          slashState={slashMenuState}
          onClose={() => setSlashMenuState(null)}
        />
      )}
    </>
  )
}
