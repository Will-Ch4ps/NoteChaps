import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFilesStore } from '../store/filesStore'
import { useTabsStore } from '../store/tabsStore'
import { useEditorStore } from '../store/editorStore'
import { FileSystemService } from '../filesystem/FileSystemService'
import { FileNode, FileExt } from '../shared/types'
import { base64ToText } from '../shared/utils'
import { insertDiagram, insertTable } from '../editor/core/commands/insert'
import { applyMark, setHeading, setParagraph } from '../editor/core/commands/formatting'
import { toggleBulletList, toggleOrderedList, insertTaskList } from '../editor/core/commands/lists'
import { diagramTemplates } from '../editor/templates/diagramTemplates'
import { tableTemplates, buildTableNode } from '../editor/templates/tableTemplates'
import { schema } from '../editor/core/schema'
import { setBlockType, wrapIn } from 'prosemirror-commands'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AppCommand {
  id: string
  label: string
  description: string
  shortcut?: string
  action: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') result.push(node)
    if (node.children) result.push(...flattenTree(node.children))
  }
  return result
}

function fuzzyMatch(query: string, name: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const s = name.toLowerCase()
  if (s.includes(q)) return true
  let qi = 0
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) qi++
  }
  return qi === q.length
}

// ─── QuickSearch ─────────────────────────────────────────────────────────────

export function QuickSearch() {
  const { quickSearchOpen, toggleQuickSearch, toggleSidebarLeft, toggleSidebarRight,
    openFindBar, toggleShortcuts, setTheme, theme } = useUIStore()
  const { tree } = useFilesStore()
  const { openTab } = useTabsStore()
  const { activeView, appActions } = useEditorStore()

  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Modo: '' = arquivo, '>' = comando
  const isCommandMode = query.startsWith('>')
  const searchQuery = isCommandMode ? query.slice(1).trim() : query

  // ─── Comandos disponíveis ───────────────────────────────────────────────
  const buildCommands = useCallback((): AppCommand[] => {
    const view = activeView
    const withView = (fn: () => void) => () => { if (view) fn() }

    const appCmds: AppCommand[] = [
      { id: 'new-file', label: 'Novo Arquivo', description: 'Cria um novo arquivo em branco', shortcut: 'Ctrl+N', action: () => appActions.newFile?.() },
      { id: 'open-file', label: 'Abrir Arquivo', description: 'Abre um arquivo do sistema', shortcut: 'Ctrl+O', action: () => appActions.openFile?.() },
      { id: 'save', label: 'Salvar', description: 'Salva o arquivo atual', shortcut: 'Ctrl+S', action: () => appActions.save?.() },
      { id: 'find', label: 'Buscar no Documento', description: 'Abre a barra de busca', shortcut: 'Ctrl+F', action: () => openFindBar('find') },
      { id: 'replace', label: 'Buscar e Substituir', description: 'Abre a barra de busca e substituição', shortcut: 'Ctrl+H', action: () => openFindBar('replace') },
      { id: 'sidebar-left', label: 'Alternar Sidebar Esquerda', description: 'Mostra/esconde o explorador de arquivos', action: toggleSidebarLeft },
      { id: 'sidebar-right', label: 'Alternar Sidebar Direita', description: 'Mostra/esconde as propriedades do documento', action: toggleSidebarRight },
      { id: 'shortcuts', label: 'Ver Atalhos de Teclado', description: 'Abre o painel de atalhos', shortcut: 'Ctrl+?', action: toggleShortcuts },
      { id: 'theme-dark', label: 'Tema Escuro', description: 'Ativa o tema escuro', action: () => setTheme('dark') },
      { id: 'theme-light', label: 'Tema Claro', description: 'Ativa o tema claro', action: () => setTheme('light') },
    ]

    const formatCmds: AppCommand[] = [
      { id: 'bold', label: 'Negrito', description: 'Aplica negrito ao texto selecionado', shortcut: 'Ctrl+B', action: withView(() => applyMark(view!, 'strong')) },
      { id: 'italic', label: 'Itálico', description: 'Aplica itálico ao texto selecionado', shortcut: 'Ctrl+I', action: withView(() => applyMark(view!, 'em')) },
      { id: 'underline', label: 'Sublinhado', description: 'Aplica sublinhado ao texto selecionado', shortcut: 'Ctrl+U', action: withView(() => applyMark(view!, 'underline')) },
      { id: 'h1', label: 'Título 1', description: 'Formata como Título 1', shortcut: 'Shift+Ctrl+1', action: withView(() => setHeading(view!, 1)) },
      { id: 'h2', label: 'Título 2', description: 'Formata como Título 2', shortcut: 'Shift+Ctrl+2', action: withView(() => setHeading(view!, 2)) },
      { id: 'h3', label: 'Título 3', description: 'Formata como Título 3', shortcut: 'Shift+Ctrl+3', action: withView(() => setHeading(view!, 3)) },
      { id: 'paragraph', label: 'Parágrafo', description: 'Formata como parágrafo normal', shortcut: 'Shift+Ctrl+0', action: withView(() => setParagraph(view!)) },
      { id: 'bullet-list', label: 'Lista com Marcadores', description: 'Insere lista com marcadores', action: withView(() => toggleBulletList(view!)) },
      { id: 'ordered-list', label: 'Lista Numerada', description: 'Insere lista numerada', action: withView(() => toggleOrderedList(view!)) },
      { id: 'task-list', label: 'Lista de Tarefas', description: 'Insere lista de tarefas com checkboxes', action: withView(() => insertTaskList(view!)) },
      { id: 'code-block', label: 'Bloco de Código', description: 'Insere bloco de código', shortcut: 'Shift+Ctrl+\\', action: withView(() => { setBlockType(schema.nodes.code_block)(view!.state, view!.dispatch); view!.focus() }) },
      { id: 'blockquote', label: 'Citação', description: 'Insere bloco de citação', action: withView(() => { wrapIn(schema.nodes.blockquote)(view!.state, view!.dispatch); view!.focus() }) },
      { id: 'table', label: 'Inserir Tabela 3×3', description: 'Insere uma tabela 3×3', action: withView(() => insertTable(view!, 3, 3)) },
    ]

    const diagramCmds: AppCommand[] = diagramTemplates.map(t => ({
      id: `diagram-${t.id}`,
      label: t.label,
      description: `Diagrama: ${t.description}`,
      action: withView(() => insertDiagram(view!, t.code))
    }))

    const tableCmds: AppCommand[] = tableTemplates.map(t => ({
      id: `table-${t.id}`,
      label: t.label,
      description: `Template: ${t.description}`,
      action: withView(() => {
        const tableNode = buildTableNode(t)
        view!.dispatch(view!.state.tr.replaceSelectionWith(tableNode))
        view!.focus()
      })
    }))

    return [...appCmds, ...formatCmds, ...diagramCmds, ...tableCmds]
  }, [activeView, appActions, openFindBar, toggleSidebarLeft, toggleSidebarRight, toggleShortcuts, setTheme])

  const allFiles = flattenTree(tree)
  const commands = buildCommands()

  const filteredFiles = searchQuery
    ? allFiles.filter(f => fuzzyMatch(searchQuery, f.name))
    : allFiles.slice(0, 30)

  const filteredCommands = searchQuery
    ? commands.filter(c => fuzzyMatch(searchQuery, c.label) || c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : commands.slice(0, 20)

  const items = isCommandMode ? filteredCommands : filteredFiles

  useEffect(() => {
    if (quickSearchOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [quickSearchOpen])

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const openFile = useCallback(async (file: FileNode) => {
    toggleQuickSearch()
    const data = await FileSystemService.openFile(file.path)
    if (data) openTab(data.path, data.name, data.ext as FileExt, base64ToText(data.content))
  }, [toggleQuickSearch, openTab])

  const executeCommand = useCallback((cmd: AppCommand) => {
    toggleQuickSearch()
    setTimeout(() => cmd.action(), 50)
  }, [toggleQuickSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { toggleQuickSearch(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      if (isCommandMode) {
        const cmd = filteredCommands[selectedIdx]
        if (cmd) executeCommand(cmd)
      } else {
        const file = filteredFiles[selectedIdx]
        if (file) openFile(file)
      }
    }
  }

  if (!quickSearchOpen) return null

  const { vaultPath } = useFilesStore.getState()
  const relativePath = (p: string) => {
    if (!vaultPath) return p
    return p.startsWith(vaultPath) ? p.slice(vaultPath.length + 1) : p
  }

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={toggleQuickSearch}
    >
      <div
        className="w-[560px] bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3a3a3a]">
          {isCommandMode ? (
            <span className="text-[#4a9eff] text-sm font-mono">&gt;</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCommandMode ? 'Buscar comando...' : 'Buscar arquivo... (> para comandos)'}
            className="flex-1 bg-transparent text-[#e0e0e0] text-[14px] outline-none placeholder-[#555]"
          />
          <kbd className="text-[10px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Resultados */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#555] text-sm">
              {isCommandMode ? 'Nenhum comando encontrado' : 'Nenhum arquivo encontrado'}
            </div>
          ) : isCommandMode ? (
            filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                  i === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{cmd.label}</div>
                  <div className="text-[11px] opacity-50 truncate">{cmd.description}</div>
                </div>
                {cmd.shortcut && (
                  <span className="text-[10px] text-[#555] font-mono flex-shrink-0">{cmd.shortcut}</span>
                )}
              </button>
            ))
          ) : (
            filteredFiles.map((file, i) => (
              <button
                key={file.path}
                onClick={() => openFile(file)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                  i === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-50">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-[11px] opacity-40 truncate ml-auto max-w-[220px]">
                  {relativePath(file.path).replace(file.name, '').replace(/[/\\]$/, '') || '/'}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-[#3a3a3a] flex gap-4 text-[11px] text-[#555]">
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↵</kbd> {isCommandMode ? 'executar' : 'abrir'}</span>
          {!isCommandMode && (
            <span className="ml-1 text-[#444]">
              <kbd className="bg-[#1a1a1a] px-1 rounded font-mono">&gt;</kbd> para comandos
            </span>
          )}
          <span className="ml-auto">{items.length} {isCommandMode ? 'comando' : 'arquivo'}{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
