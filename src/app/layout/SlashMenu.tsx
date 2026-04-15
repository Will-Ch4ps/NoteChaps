import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorView } from 'prosemirror-view'
import { wrapIn } from 'prosemirror-commands'
import { SlashState } from '../../editor/modes/plugins/slashCommandPlugin'
import { diagramTemplates, DiagramTemplate } from '../../editor/templates/diagramTemplates'
import { tableTemplates, buildTableNode } from '../../editor/templates/tableTemplates'
import { insertDiagram, insertTable } from '../../editor/core/commands/insert'
import { schema } from '../../editor/core/schema'

interface SlashItem {
  id: string
  label: string
  description: string
  icon: string
  command: string
  keywords: string[]
  action: (view: EditorView, from: number, to: number) => void
}

function getCategoryIcon(category: DiagramTemplate['category']): string {
  return { fluxo: '->', sequencia: '=>', arquitetura: '[]', banco: 'DB', planejamento: 'PL' }[category] ?? '<>'
}

function buildItems(): SlashItem[] {
  const diagramItems: SlashItem[] = diagramTemplates.map((template) => ({
    id: template.id,
    label: template.label,
    description: template.description,
    icon: getCategoryIcon(template.category),
    command: template.slashCommand,
    keywords: [template.category, template.label, template.description, template.slashCommand],
    action: (view, from, to) => {
      view.dispatch(view.state.tr.delete(from, to))
      insertDiagram(view, template.code)
    }
  }))

  const tableItems: SlashItem[] = tableTemplates.map((template) => ({
    id: template.id,
    label: template.label,
    description: template.description,
    icon: 'TB',
    command: template.slashCommand,
    keywords: ['tabela', 'table', template.label, template.description, template.slashCommand],
    action: (view, from, to) => {
      const tableNode = buildTableNode(template)
      view.dispatch(view.state.tr.delete(from, to).replaceSelectionWith(tableNode))
      view.focus()
    }
  }))

  const basicItems: SlashItem[] = [
    {
      id: 'tabela',
      label: 'Tabela',
      description: 'Insere tabela 3x3 vazia.',
      icon: 'TB',
      command: '/tabela',
      keywords: ['tabela', 'table', 'grid'],
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        insertTable(view, 3, 3)
      }
    },
    {
      id: 'diagrama',
      label: 'Diagrama Mermaid',
      description: 'Insere um fluxo base para voce editar.',
      icon: '<>',
      command: '/diagrama',
      keywords: ['diagrama', 'mermaid', 'flowchart', 'grafico'],
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        insertDiagram(view, 'flowchart TD\n    A[Inicio] --> B[Fim]')
      }
    },
    {
      id: 'codigo',
      label: 'Bloco de Codigo',
      description: 'Insere bloco de codigo simples.',
      icon: '{}',
      command: '/codigo',
      keywords: ['codigo', 'code', 'snippet'],
      action: (view, from, to) => {
        const node = schema.nodes.code_block.create({})
        view.dispatch(view.state.tr.delete(from, to).replaceSelectionWith(node))
        view.focus()
      }
    },
    {
      id: 'citacao',
      label: 'Citacao',
      description: 'Insere bloco de citacao.',
      icon: '""',
      command: '/citacao',
      keywords: ['citacao', 'blockquote', 'quote'],
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        wrapIn(schema.nodes.blockquote)(view.state, view.dispatch)
        view.focus()
      }
    }
  ]

  return [...basicItems, ...diagramItems, ...tableItems]
}

function scoreItem(query: string, item: SlashItem): number {
  if (!query) return 1
  const normalizedQuery = query.toLowerCase()
  const command = item.command.toLowerCase()
  const label = item.label.toLowerCase()
  const description = item.description.toLowerCase()
  const keywords = item.keywords.join(' ').toLowerCase()

  if (command === `/${normalizedQuery}`) return 120
  if (command.startsWith(`/${normalizedQuery}`)) return 90
  if (label.startsWith(normalizedQuery)) return 70
  if (keywords.includes(normalizedQuery)) return 40
  if (description.includes(normalizedQuery)) return 25
  return 0
}

interface SlashMenuProps {
  view: EditorView
  slashState: SlashState
  onClose: () => void
}

export function SlashMenu({ view, slashState, onClose }: SlashMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const allItems = useMemo(() => buildItems(), [])

  const filtered = useMemo(() => {
    const withScore = allItems
      .map((item) => ({ item, score: scoreItem(slashState.query, item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    return withScore.map((entry) => entry.item)
  }, [allItems, slashState.query])

  useEffect(() => {
    setSelectedIdx(0)
  }, [slashState.query])

  useEffect(() => {
    const item = listRef.current?.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const executeItem = useCallback(
    (item: SlashItem) => {
      onClose()
      item.action(view, slashState.from, slashState.to)
    },
    [view, slashState, onClose]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!slashState.active) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIdx((index) => Math.min(index + 1, filtered.length - 1))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIdx((index) => Math.max(index - 1, 0))
        return
      }

      if ((event.key === 'Enter' || event.key === 'Tab') && filtered[selectedIdx]) {
        event.preventDefault()
        event.stopPropagation()
        executeItem(filtered[selectedIdx])
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [filtered, selectedIdx, executeItem, onClose, slashState.active])

  if (filtered.length === 0) return null

  const coords = view.coordsAtPos(slashState.from)
  const menuWidth = 360
  const viewportMargin = 12
  const estimatedHeight = Math.min(460, 140 + filtered.length * 56)
  const spaceBelow = window.innerHeight - coords.bottom - viewportMargin
  const spaceAbove = coords.top - viewportMargin
  const openUp = spaceBelow < 240 && spaceAbove > spaceBelow
  const top = openUp
    ? Math.max(viewportMargin, coords.top - estimatedHeight - 8)
    : Math.min(coords.bottom + 6, window.innerHeight - estimatedHeight - viewportMargin)
  const left = Math.max(viewportMargin, Math.min(coords.left, window.innerWidth - menuWidth - viewportMargin))
  const maxListHeight = Math.max(160, (openUp ? spaceAbove : spaceBelow) - 72)

  return (
    <div
      style={{ position: 'fixed', top, left, width: menuWidth, zIndex: 99999 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#3a3a3a]">
          <p className="text-[11px] text-[#858585] uppercase tracking-wide">Insercao Rapida</p>
          <p className="text-[12px] text-[#cccccc] mt-0.5">
            {slashState.query
              ? `Filtro: /${slashState.query}. Enter insere o primeiro resultado.`
              : 'Digite apos "/" para filtrar. Enter insere o primeiro resultado.'}
          </p>
        </div>

        <div ref={listRef} className="overflow-y-auto py-1 scrollbar-thin" style={{ maxHeight: `${maxListHeight}px` }}>
          {filtered.map((item, index) => (
            <button
              key={item.id}
              onClick={() => executeItem(item)}
              className={`w-full text-left px-3 py-2 transition-colors ${
                index === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 text-center text-[11px] font-mono mt-0.5 opacity-80 shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">{item.command}</span>
                  </div>
                  <p className="text-[11px] opacity-70 leading-snug mt-0.5 whitespace-normal">{item.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-3 py-1.5 border-t border-[#3a3a3a] flex gap-3 text-[10px] text-[#777]">
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">Enter</kbd> inserir primeiro</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">Tab</kbd> inserir selecionado</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">Up/Down</kbd> navegar (opcional)</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}

