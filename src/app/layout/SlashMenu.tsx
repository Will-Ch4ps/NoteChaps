import React, { useEffect, useRef, useState, useCallback } from 'react'
import { EditorView } from 'prosemirror-view'
import { wrapIn } from 'prosemirror-commands'
import { slashPluginKey, SlashState } from '../../editor/modes/plugins/slashCommandPlugin'
import { diagramTemplates, DiagramTemplate } from '../../editor/templates/diagramTemplates'
import { tableTemplates, buildTableNode } from '../../editor/templates/tableTemplates'
import { insertDiagram, insertTable } from '../../editor/core/commands/insert'
import { schema } from '../../editor/core/schema'

interface SlashItem {
  id: string
  label: string
  description: string
  icon: string
  action: (view: EditorView, from: number, to: number) => void
}

function buildItems(): SlashItem[] {
  const diagramItems: SlashItem[] = diagramTemplates.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description,
    icon: getCategoryIcon(t.category),
    action: (view, from, to) => {
      const tr = view.state.tr.delete(from, to)
      view.dispatch(tr)
      insertDiagram(view, t.code)
    }
  }))

  const tableItems: SlashItem[] = tableTemplates.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description,
    icon: '⊞',
    action: (view, from, to) => {
      const tr = view.state.tr.delete(from, to)
      const tableNode = buildTableNode(t)
      view.dispatch(tr.replaceSelectionWith(tableNode))
      view.focus()
    }
  }))

  const basicItems: SlashItem[] = [
    {
      id: 'tabela',
      label: 'Tabela',
      description: 'Insere tabela 3×3 vazia',
      icon: '⊞',
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        insertTable(view, 3, 3)
      }
    },
    {
      id: 'diagrama',
      label: 'Diagrama Mermaid',
      description: 'Bloco de código mermaid vazio',
      icon: '◇',
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        insertDiagram(view, 'flowchart TD\n    A[Início] --> B[Fim]')
      }
    },
    {
      id: 'codigo',
      label: 'Bloco de Código',
      description: 'Insere bloco de código',
      icon: '{}',
      action: (view, from, to) => {
        const node = schema.nodes.code_block.create({})
        view.dispatch(view.state.tr.delete(from, to).replaceSelectionWith(node))
        view.focus()
      }
    },
    {
      id: 'citacao',
      label: 'Citação',
      description: 'Bloco de citação',
      icon: '❝',
      action: (view, from, to) => {
        view.dispatch(view.state.tr.delete(from, to))
        wrapIn(schema.nodes.blockquote)(view.state, view.dispatch)
        view.focus()
      }
    },
  ]

  return [...basicItems, ...diagramItems, ...tableItems]
}

function getCategoryIcon(cat: DiagramTemplate['category']): string {
  return { fluxo: '→', sequencia: '⟷', arquitetura: '◻', banco: '🗄', planejamento: '📅' }[cat] ?? '◇'
}

function fuzzyMatch(query: string, label: string, description: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return label.toLowerCase().includes(q) || description.toLowerCase().includes(q)
}

interface SlashMenuProps {
  view: EditorView
  slashState: SlashState
  onClose: () => void
}

export function SlashMenu({ view, slashState, onClose }: SlashMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const allItems = buildItems()

  const filtered = allItems.filter(item =>
    fuzzyMatch(slashState.query, item.label, item.description)
  )

  useEffect(() => { setSelectedIdx(0) }, [slashState.query])

  useEffect(() => {
    const item = listRef.current?.children[selectedIdx] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const executeItem = useCallback((item: SlashItem) => {
    onClose()
    item.action(view, slashState.from, slashState.to)
  }, [view, slashState, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slashState.active) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault()
        e.stopPropagation()
        executeItem(filtered[selectedIdx])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [filtered, selectedIdx, executeItem, onClose, slashState.active])

  if (filtered.length === 0) return null

  // Posicionar próximo ao cursor
  const coords = view.coordsAtPos(slashState.from)
  const style: React.CSSProperties = {
    position: 'fixed',
    top: coords.bottom + 4,
    left: Math.min(coords.left, window.innerWidth - 320),
    zIndex: 99999
  }

  return (
    <div style={style} onClick={e => e.stopPropagation()}>
      <div className="w-[300px] bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => executeItem(item)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                i === selectedIdx ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#37373d]'
              }`}
            >
              <span className="w-6 text-center text-[14px] flex-shrink-0 opacity-70">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{item.label}</div>
                <div className="text-[11px] opacity-50 truncate">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 border-t border-[#3a3a3a] flex gap-3 text-[10px] text-[#555]">
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">↵</kbd> inserir</span>
          <span><kbd className="bg-[#1a1a1a] px-1 rounded font-mono">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
