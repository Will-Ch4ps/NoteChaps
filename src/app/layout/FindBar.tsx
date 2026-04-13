import React, { useEffect, useRef, useState } from 'react'
import { TextSelection } from 'prosemirror-state'
import { useUIStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'
import { findPluginKey } from '../../editor/modes/plugins/findPlugin'

export function FindBar() {
  const { findBarOpen, findBarMode, closeFindBar } = useUIStore()
  const { activeView } = useEditorStore()

  const [query, setQuery] = useState('')
  const [replaceStr, setReplaceStr] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isReplace = findBarMode === 'replace'

  useEffect(() => {
    if (findBarOpen) {
      setTimeout(() => inputRef.current?.focus(), 30)
    } else {
      // Limpar decorações ao fechar
      updateFind('', caseSensitive)
    }
  }, [findBarOpen])

  const updateFind = (q: string, cs: boolean) => {
    if (!activeView) return
    activeView.dispatch(
      activeView.state.tr.setMeta(findPluginKey, { query: q, caseSensitive: cs, currentMatch: 0 })
    )
  }

  const handleQueryChange = (q: string) => {
    setQuery(q)
    updateFind(q, caseSensitive)
  }

  const navigate = (dir: 1 | -1) => {
    if (!activeView) return
    const state = findPluginKey.getState(activeView.state)
    if (!state || state.matches.length === 0) return
    const total = state.matches.length
    const next = ((state.currentMatch + dir) % total + total) % total
    activeView.dispatch(activeView.state.tr.setMeta(findPluginKey, { currentMatch: next }))
    // Scroll para o match
    const match = state.matches[next]
    if (match) {
      const sel = TextSelection.create(activeView.state.doc, match.from, match.to)
      activeView.dispatch(activeView.state.tr.setSelection(sel).scrollIntoView())
    }
  }

  const replaceOne = () => {
    if (!activeView) return
    const state = findPluginKey.getState(activeView.state)
    if (!state || state.matches.length === 0) return
    const match = state.matches[state.currentMatch]
    if (!match) return
    activeView.dispatch(
      activeView.state.tr.insertText(replaceStr, match.from, match.to)
    )
  }

  const replaceAll = () => {
    if (!activeView) return
    const state = findPluginKey.getState(activeView.state)
    if (!state || state.matches.length === 0) return
    // Substitui de trás para frente para não invalidar posições
    let tr = activeView.state.tr
    const reversed = [...state.matches].reverse()
    for (const m of reversed) {
      tr = tr.insertText(replaceStr, m.from, m.to)
    }
    activeView.dispatch(tr)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { closeFindBar(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      navigate(e.shiftKey ? -1 : 1)
    }
  }

  if (!findBarOpen) return null

  const matchState = activeView ? findPluginKey.getState(activeView.state) : null
  const matchCount = matchState?.matches.length ?? 0
  const currentIdx = matchState?.currentMatch ?? 0

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#2a2a2a] border-b border-[#333] text-[12px]">
      {/* Campo de busca */}
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-md px-2 py-1 min-w-[220px] focus-within:border-[#4a9eff] transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar..."
          className="bg-transparent text-[#e0e0e0] outline-none placeholder-[#555] w-full text-[12px]"
        />
        {query && (
          <span className="text-[10px] text-[#666] whitespace-nowrap">
            {matchCount === 0 ? 'sem resultados' : `${currentIdx + 1}/${matchCount}`}
          </span>
        )}
      </div>

      {/* Navegação */}
      <button
        onClick={() => navigate(-1)}
        disabled={matchCount === 0}
        title="Anterior (Shift+Enter)"
        className="p-1 rounded text-[#888] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button
        onClick={() => navigate(1)}
        disabled={matchCount === 0}
        title="Próximo (Enter)"
        className="p-1 rounded text-[#888] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* Case sensitive */}
      <button
        onClick={() => { setCaseSensitive(!caseSensitive); updateFind(query, !caseSensitive) }}
        title="Diferenciar maiúsculas/minúsculas"
        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${caseSensitive ? 'bg-[#4a9eff33] text-[#4a9eff]' : 'text-[#666] hover:text-[#aaa] hover:bg-[#3a3a3a]'}`}
      >
        Aa
      </button>

      {/* Replace (se modo replace) */}
      {isReplace && (
        <>
          <div className="w-px h-4 bg-[#444]" />
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-md px-2 py-1 min-w-[180px] focus-within:border-[#4a9eff] transition-colors">
            <input
              value={replaceStr}
              onChange={e => setReplaceStr(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Substituir por..."
              className="bg-transparent text-[#e0e0e0] outline-none placeholder-[#555] w-full text-[12px]"
            />
          </div>
          <button
            onClick={replaceOne}
            disabled={matchCount === 0}
            className="px-2 py-1 rounded text-[11px] text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Substituir
          </button>
          <button
            onClick={replaceAll}
            disabled={matchCount === 0}
            className="px-2 py-1 rounded text-[11px] text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Substituir tudo
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* Fechar */}
      <button
        onClick={closeFindBar}
        title="Fechar (Esc)"
        className="p-1 rounded text-[#666] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] transition-colors"
      >
        ×
      </button>
    </div>
  )
}
