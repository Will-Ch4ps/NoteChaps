import React, { useMemo } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'
import { VisualMode } from '../modes/VisualMode'
import { RawMode } from '../modes/RawMode'
import { createEditorState } from '../core/EditorInstance'
import { MarkdownConverter } from '../../filesystem/converters/MarkdownConverter'
import { FileSystemService } from '../../filesystem/FileSystemService'
import { FileExt } from '../../shared/types'
import { base64ToText } from '../../shared/utils'
import { PAGE_MARGINS } from '../../shared/constants'

function EmptyState() {
  const { appActions } = useEditorStore()
  const { recentFiles } = useTabsStore()
  const { toggleQuickSearch } = useUIStore()

  const shortcuts = [
    { keys: 'Ctrl+N', desc: 'Novo arquivo' },
    { keys: 'Ctrl+O', desc: 'Abrir arquivo' },
    { keys: 'Ctrl+P', desc: 'Buscar no vault' },
    { keys: 'Ctrl+Shift+P', desc: 'Paleta de comandos' },
    { keys: '/', desc: 'Slash commands (diagramas, tabelas)' },
    { keys: 'Ctrl+?', desc: 'Ver todos os atalhos' },
  ]

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-app)] select-none">
      <div className="w-[480px]">
        {/* Logo / Branding */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#4a9eff22] border border-[#4a9eff44] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#e0e0e0]">NoteChaps</h1>
            <p className="text-[12px] text-[#555]">Editor Markdown para Desenvolvedores</p>
          </div>
        </div>

        {/* Ações principais */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => appActions.newFile?.()}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#333] hover:border-[#4a9eff] hover:bg-[#4a9eff11] transition-all text-[#888] hover:text-[#4a9eff]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span className="text-[11px]">Novo Arquivo</span>
            <kbd className="text-[9px] font-mono bg-[var(--color-bg-app)] px-1 rounded opacity-50">Ctrl+N</kbd>
          </button>
          <button
            onClick={() => appActions.openFile?.()}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#333] hover:border-[#4a9eff] hover:bg-[#4a9eff11] transition-all text-[#888] hover:text-[#4a9eff]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-[11px]">Abrir Arquivo</span>
            <kbd className="text-[9px] font-mono bg-[var(--color-bg-app)] px-1 rounded opacity-50">Ctrl+O</kbd>
          </button>
          <button
            onClick={toggleQuickSearch}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#333] hover:border-[#4a9eff] hover:bg-[#4a9eff11] transition-all text-[#888] hover:text-[#4a9eff]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="text-[11px]">Buscar no Vault</span>
            <kbd className="text-[9px] font-mono bg-[var(--color-bg-app)] px-1 rounded opacity-50">Ctrl+P</kbd>
          </button>
        </div>

        {/* Atalhos rápidos */}
        <div className="mb-6">
          <h3 className="text-[10px] text-[#444] uppercase tracking-wider mb-3">Atalhos Essenciais</h3>
          <div className="grid grid-cols-2 gap-1">
            {shortcuts.map(s => (
              <div key={s.keys} className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#252525] transition-colors">
                <span className="text-[11px] text-[#666]">{s.desc}</span>
                <kbd className="text-[9px] font-mono bg-[#252525] text-[#555] px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Arquivos recentes */}
        {recentFiles.length > 0 && (
          <div>
            <h3 className="text-[10px] text-[#444] uppercase tracking-wider mb-2">Recentes</h3>
            <div className="flex flex-col gap-1">
              {recentFiles.slice(0, 6).map(f => (
                <button
                  key={f.filePath}
                  onClick={async () => {
                    const data = await FileSystemService.openFile(f.filePath)
                    if (!data) return
                    const { openTab } = useTabsStore.getState()
                    openTab(data.path, data.name, data.ext as FileExt, base64ToText(data.content))
                  }}
                  className="flex items-center gap-2 py-1 px-2 rounded text-[#555] hover:text-[#888] hover:bg-[#252525] transition-colors text-left w-full"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40 flex-shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="text-[11px] truncate flex-1">{f.title}</span>
                  <span className="text-[9px] opacity-40 flex-shrink-0 truncate max-w-[120px]">{f.filePath.split(/[/\\]/).slice(-2).join('/')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EditorPage() {
  const { getActiveTab } = useTabsStore()
  const { pageMargin, zoom, pageWidth } = useUIStore()
  const tab = getActiveTab()

  const editorState = useMemo(() => {
    if (!tab) return null
    if (tab.editorState) return tab.editorState
    return createEditorState(
      tab.rawContent ? MarkdownConverter.toDoc(tab.rawContent) : undefined
    )
  }, [tab?.id, tab?.editorState])

  if (!tab) {
    return <EmptyState />
  }

  const margins = PAGE_MARGINS[pageMargin]

  return (
    <div className="flex-1 bg-[var(--color-bg-app)] overflow-auto flex justify-center py-10">
      <div
        className="bg-white shadow-[0_4px_24px_rgba(0,0,0,0.5)] w-full"
        style={{
          maxWidth: `${pageWidth}px`,
          minHeight: '1060px',
          height: 'max-content',
          padding: `${margins.vertical} ${margins.horizontal}`,
          zoom: zoom,
          display: 'block'
        }}
      >
        {tab.mode === 'visual' && editorState ? (
          <VisualMode tabId={tab.id} initialState={editorState} />
        ) : (
          <RawMode tabId={tab.id} initialContent={tab.rawContent} />
        )}
      </div>
    </div>
  )
}