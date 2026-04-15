import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { setBlockType, wrapIn } from 'prosemirror-commands'
import { insertDiagram, insertTable } from '../editor/core/commands/insert'
import { applyMark, setHeading, setParagraph } from '../editor/core/commands/formatting'
import { toggleBulletList, toggleOrderedList, insertTaskList } from '../editor/core/commands/lists'
import { schema } from '../editor/core/schema'
import { diagramTemplates } from '../editor/templates/diagramTemplates'
import { tableTemplates, buildTableNode } from '../editor/templates/tableTemplates'
import { FileSystemService } from '../filesystem/FileSystemService'
import { useEditorStore } from '../store/editorStore'
import { useFilesStore } from '../store/filesStore'
import { useTabsStore } from '../store/tabsStore'
import { useUIStore } from '../store/uiStore'
import { FileExt, FileNode } from '../shared/types'
import { base64ToText } from '../shared/utils'

interface AppCommand {
  id: string
  label: string
  description: string
  shortcut?: string
  action: () => void
}

function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') result.push(node)
    if (node.children) result.push(...flattenTree(node.children))
  }
  return result
}

function fuzzyMatch(query: string, value: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const v = value.toLowerCase()
  if (v.includes(q)) return true
  let qi = 0
  for (let i = 0; i < v.length && qi < q.length; i++) {
    if (v[i] === q[qi]) qi++
  }
  return qi === q.length
}

export function QuickSearch() {
  const {
    quickSearchOpen,
    toggleQuickSearch,
    toggleSidebarLeft,
    toggleSidebarRight,
    openFindBar,
    toggleShortcuts,
    setTheme
  } = useUIStore()
  const { tree } = useFilesStore()
  const { openTab } = useTabsStore()
  const { activeView, appActions } = useEditorStore()

  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isCommandMode = query.startsWith('>')
  const rawSearchQuery = isCommandMode ? query.slice(1).trim() : query
  const searchQuery = useDeferredValue(rawSearchQuery)

  const commands = useMemo<AppCommand[]>(() => {
    const view = activeView
    const withView = (fn: () => void) => () => {
      if (view) fn()
    }

    const appCmds: AppCommand[] = [
      {
        id: 'new-file',
        label: 'Novo Arquivo',
        description: 'Cria um novo arquivo em branco',
        shortcut: 'Ctrl+N',
        action: () => appActions.newFile?.()
      },
      {
        id: 'open-file',
        label: 'Abrir Arquivo',
        description: 'Abre um arquivo do sistema',
        shortcut: 'Ctrl+O',
        action: () => appActions.openFile?.()
      },
      {
        id: 'save',
        label: 'Salvar',
        description: 'Salva o arquivo atual',
        shortcut: 'Ctrl+S',
        action: () => appActions.save?.()
      },
      {
        id: 'find',
        label: 'Buscar no Documento',
        description: 'Abre a barra de busca',
        shortcut: 'Ctrl+F',
        action: () => openFindBar('find')
      },
      {
        id: 'replace',
        label: 'Buscar e Substituir',
        description: 'Abre a barra de busca e substituicao',
        shortcut: 'Ctrl+H',
        action: () => openFindBar('replace')
      },
      {
        id: 'sidebar-left',
        label: 'Alternar Sidebar Esquerda',
        description: 'Mostra ou esconde o explorador de arquivos',
        action: toggleSidebarLeft
      },
      {
        id: 'sidebar-right',
        label: 'Alternar Sidebar Direita',
        description: 'Mostra ou esconde o painel de propriedades',
        action: toggleSidebarRight
      },
      {
        id: 'shortcuts',
        label: 'Ver Atalhos de Teclado',
        description: 'Abre o painel de atalhos',
        shortcut: 'Ctrl+?',
        action: toggleShortcuts
      },
      {
        id: 'theme-dark',
        label: 'Tema Escuro',
        description: 'Ativa o tema escuro',
        action: () => setTheme('dark')
      },
      {
        id: 'theme-light',
        label: 'Tema Claro',
        description: 'Ativa o tema claro',
        action: () => setTheme('light')
      }
    ]

    const formatCmds: AppCommand[] = [
      {
        id: 'bold',
        label: 'Negrito',
        description: 'Aplica negrito ao texto selecionado',
        shortcut: 'Ctrl+B',
        action: withView(() => applyMark(view!, 'strong'))
      },
      {
        id: 'italic',
        label: 'Italico',
        description: 'Aplica italico ao texto selecionado',
        shortcut: 'Ctrl+I',
        action: withView(() => applyMark(view!, 'em'))
      },
      {
        id: 'underline',
        label: 'Sublinhado',
        description: 'Aplica sublinhado ao texto selecionado',
        shortcut: 'Ctrl+U',
        action: withView(() => applyMark(view!, 'underline'))
      },
      {
        id: 'h1',
        label: 'Titulo 1',
        description: 'Formata como titulo 1',
        shortcut: 'Shift+Ctrl+1',
        action: withView(() => setHeading(view!, 1))
      },
      {
        id: 'h2',
        label: 'Titulo 2',
        description: 'Formata como titulo 2',
        shortcut: 'Shift+Ctrl+2',
        action: withView(() => setHeading(view!, 2))
      },
      {
        id: 'h3',
        label: 'Titulo 3',
        description: 'Formata como titulo 3',
        shortcut: 'Shift+Ctrl+3',
        action: withView(() => setHeading(view!, 3))
      },
      {
        id: 'paragraph',
        label: 'Paragrafo',
        description: 'Formata como paragrafo normal',
        shortcut: 'Shift+Ctrl+0',
        action: withView(() => setParagraph(view!))
      },
      {
        id: 'bullet-list',
        label: 'Lista com Marcadores',
        description: 'Insere lista com marcadores',
        action: withView(() => toggleBulletList(view!))
      },
      {
        id: 'ordered-list',
        label: 'Lista Numerada',
        description: 'Insere lista numerada',
        action: withView(() => toggleOrderedList(view!))
      },
      {
        id: 'task-list',
        label: 'Lista de Tarefas',
        description: 'Insere lista de tarefas com checkboxes',
        action: withView(() => insertTaskList(view!))
      },
      {
        id: 'code-block',
        label: 'Bloco de Codigo',
        description: 'Insere bloco de codigo',
        shortcut: 'Shift+Ctrl+\\',
        action: withView(() => {
          setBlockType(schema.nodes.code_block)(view!.state, view!.dispatch)
          view!.focus()
        })
      },
      {
        id: 'blockquote',
        label: 'Citacao',
        description: 'Insere bloco de citacao',
        action: withView(() => {
          wrapIn(schema.nodes.blockquote)(view!.state, view!.dispatch)
          view!.focus()
        })
      },
      {
        id: 'table',
        label: 'Inserir Tabela 3x3',
        description: 'Insere uma tabela 3x3',
        action: withView(() => insertTable(view!, 3, 3))
      }
    ]

    const diagramCmds: AppCommand[] = diagramTemplates.map((template) => ({
      id: `diagram-${template.id}`,
      label: template.label,
      description: `Diagrama: ${template.description}`,
      action: withView(() => insertDiagram(view!, template.code))
    }))

    const tableCmds: AppCommand[] = tableTemplates.map((template) => ({
      id: `table-${template.id}`,
      label: template.label,
      description: `Template: ${template.description}`,
      action: withView(() => {
        const tableNode = buildTableNode(template)
        view!.dispatch(view!.state.tr.replaceSelectionWith(tableNode))
        view!.focus()
      })
    }))

    return [...appCmds, ...formatCmds, ...diagramCmds, ...tableCmds]
  }, [
    activeView,
    appActions,
    openFindBar,
    toggleSidebarLeft,
    toggleSidebarRight,
    toggleShortcuts,
    setTheme
  ])

  const allFiles = useMemo(() => flattenTree(tree), [tree])

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return allFiles.slice(0, 80)
    return allFiles.filter((file) => fuzzyMatch(searchQuery, file.name))
  }, [allFiles, searchQuery])

  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands.slice(0, 40)
    return commands.filter(
      (command) =>
        fuzzyMatch(searchQuery, command.label) || command.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [commands, searchQuery])

  const items = isCommandMode ? filteredCommands : filteredFiles

  useEffect(() => {
    if (!quickSearchOpen) return
    setQuery('')
    setSelectedIdx(0)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [quickSearchOpen])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const openFile = useCallback(
    async (file: FileNode) => {
      toggleQuickSearch()
      const data = await FileSystemService.openFile(file.path)
      if (!data) return
      openTab(data.path, data.name, data.ext as FileExt, base64ToText(data.content))
    },
    [toggleQuickSearch, openTab]
  )

  const executeCommand = useCallback(
    (command: AppCommand) => {
      toggleQuickSearch()
      setTimeout(() => command.action(), 50)
    },
    [toggleQuickSearch]
  )

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      toggleQuickSearch()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIdx((index) => Math.min(index + 1, items.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIdx((index) => Math.max(index - 1, 0))
    }
    if (event.key === 'Enter') {
      if (isCommandMode) {
        const command = filteredCommands[selectedIdx]
        if (command) executeCommand(command)
      } else {
        const file = filteredFiles[selectedIdx]
        if (file) openFile(file)
      }
    }
  }

  if (!quickSearchOpen) return null

  const { vaultPath } = useFilesStore.getState()
  const relativePath = (path: string) => {
    if (!vaultPath) return path
    return path.startsWith(vaultPath) ? path.slice(vaultPath.length + 1) : path
  }

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={toggleQuickSearch}
    >
      <div
        className="w-[580px] max-w-[92vw] bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3a3a3a]">
          {isCommandMode ? (
            <span className="text-[#4a9eff] text-sm font-mono">&gt;</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCommandMode ? 'Buscar comando...' : 'Buscar arquivo... (> para comandos)'}
            className="flex-1 bg-transparent text-[#e0e0e0] text-[14px] outline-none placeholder-[#555]"
          />
          <kbd className="text-[10px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#555] text-sm">
              {isCommandMode ? 'Nenhum comando encontrado' : 'Nenhum arquivo encontrado'}
            </div>
          ) : isCommandMode ? (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => executeCommand(command)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                  index === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{command.label}</div>
                  <div className="text-[11px] opacity-50 truncate">{command.description}</div>
                </div>
                {command.shortcut && (
                  <span className="text-[10px] text-[#555] font-mono flex-shrink-0">{command.shortcut}</span>
                )}
              </button>
            ))
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.path}
                onClick={() => openFile(file)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                  index === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
                }`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 opacity-50"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-[11px] opacity-40 truncate ml-auto max-w-[220px]">
                  {relativePath(file.path).replace(file.name, '').replace(/[/\\]$/, '') || '/'}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-1.5 border-t border-[#3a3a3a] flex gap-4 text-[11px] text-[#555]">
          <span>
            <kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↑↓</kbd> navegar
          </span>
          <span>
            <kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↵</kbd> {isCommandMode ? 'executar' : 'abrir'}
          </span>
          {!isCommandMode && (
            <span className="ml-1 text-[#444]">
              <kbd className="bg-[#1a1a1a] px-1 rounded font-mono">&gt;</kbd> para comandos
            </span>
          )}
          <span className="ml-auto">
            {items.length} {isCommandMode ? 'comando' : 'arquivo'}
            {items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
