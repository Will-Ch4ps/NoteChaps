import React, { useState, useEffect } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'

export function StatusBar() {
  const { getActiveTab, toggleTabAutoSave } = useTabsStore()
  const { docProperties, selectionProperties } = useEditorStore()
  const { zoom, setZoom, pageWidth, setPageWidth, rawFontSize, setRawFontSize, theme, setTheme, toggleShortcuts } = useUIStore()
  const tab = getActiveTab()
  const [saving, setSaving] = useState(false)

  // Exibe "Salvando..." brevemente quando o tab sai de dirty (auto-save do doc disparou)
  useEffect(() => {
    let wasDirty = false
    return useTabsStore.subscribe((state) => {
      const active = state.tabs.find(t => t.id === state.activeTabId)
      if (!active) return
      if (wasDirty && !active.isDirty && active.autoSave) {
        setSaving(true)
        setTimeout(() => setSaving(false), 1200)
      }
      wasDirty = active.isDirty
    })
  }, [])

  return (
    <div className="flex items-center justify-between h-6 px-4 bg-[var(--color-bg-app)] border-t border-[#333] text-xs text-[#555] select-none shrink-0">
      <div className="flex items-center gap-4 overflow-hidden">
        {tab && (
          <>
            {/* BUG FIX: Adicionado truncate e max-w para não estourar a barra */}
            <span 
              className="truncate max-w-[200px] md:max-w-[400px]" 
              title={tab.filePath}
            >
              {tab.filePath.startsWith('untitled:') ? 'novo arquivo' : tab.filePath}
            </span>
            {saving && <span className="text-[#30d158] shrink-0">✓ salvando...</span>}
            {!saving && tab.isDirty && <span className="text-[#4a9eff] shrink-0">● não salvo</span>}
            <button
              onClick={() => toggleTabAutoSave(tab.id)}
              title={tab.autoSave ? 'Auto-save ativo neste doc (clique para desativar)' : 'Auto-save inativo neste doc (clique para ativar)'}
              className={`shrink-0 px-1 rounded text-[10px] font-mono transition-colors ${tab.autoSave ? 'text-[#30d158]' : 'text-[#555] hover:text-[#888]'}`}
            >
              AUTO
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {docProperties && (
          <>
            <span>{docProperties.wordCount} palavras</span>
            {selectionProperties && selectionProperties.wordCount > 0 && (
              <span className="text-[#4a9eff]">({selectionProperties.wordCount} sel.)</span>
            )}
            <span>{docProperties.charCount} chars</span>
          </>
        )}
        {tab && (
          <span className={`font-mono uppercase text-[10px] font-bold px-1 rounded ${
            tab.mode === 'raw' ? 'text-[#30d158]' : 'text-[#4a9eff]'
          }`}>
            {tab.mode}
          </span>
        )}
        {/* Largura da página */}
        <div className="flex items-center gap-1">
          <button onClick={() => setPageWidth(pageWidth - 50)} className="hover:text-[#aaa] w-4 text-center">−</button>
          <span className="w-12 text-center">{pageWidth}px</span>
          <button onClick={() => setPageWidth(pageWidth + 50)} className="hover:text-[#aaa] w-4 text-center">+</button>
        </div>
        {/* Tamanho de fonte (raw mode) */}
        {tab?.mode === 'raw' && (
          <div className="flex items-center gap-1">
            <button onClick={() => setRawFontSize(rawFontSize - 1)} className="hover:text-[#aaa] w-4 text-center">A−</button>
            <span className="w-6 text-center">{rawFontSize}</span>
            <button onClick={() => setRawFontSize(rawFontSize + 1)} className="hover:text-[#aaa] w-4 text-center">A+</button>
          </div>
        )}
        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="hover:text-[#aaa] w-4 text-center">−</button>
          <button
            onClick={() => setZoom(1.0)}
            title="Clique para redefinir zoom para 100%"
            className={`w-10 text-center hover:text-[#4a9eff] transition-colors ${zoom !== 1.0 ? 'text-[#4a9eff]' : ''}`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="hover:text-[#aaa] w-4 text-center">+</button>
        </div>

        {/* Tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          className="hover:text-[#aaa] transition-colors"
        >
          {theme === 'dark' ? '☀' : '◑'}
        </button>

        {/* Atalhos */}
        <button
          onClick={toggleShortcuts}
          title="Ver atalhos de teclado (Ctrl+?)"
          className="hover:text-[#aaa] transition-colors font-mono text-[10px]"
        >
          ?
        </button>
      </div>
    </div>
  )
}