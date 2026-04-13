import React from 'react'
import { useUIStore } from '../../store/uiStore'

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutSection {
  title: string
  items: ShortcutEntry[]
}

const shortcuts: ShortcutSection[] = [
  {
    title: 'Arquivo',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Novo arquivo' },
      { keys: ['Ctrl', 'O'], description: 'Abrir arquivo' },
      { keys: ['Ctrl', 'S'], description: 'Salvar' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Salvar como' },
      { keys: ['Ctrl', 'W'], description: 'Fechar aba' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Reabrir última aba fechada' },
    ]
  },
  {
    title: 'Editor',
    items: [
      { keys: ['Ctrl', 'E'], description: 'Alternar modo Visual / Raw' },
      { keys: ['Ctrl', 'Z'], description: 'Desfazer' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer' },
      { keys: ['Ctrl', 'F'], description: 'Buscar no documento' },
      { keys: ['Ctrl', 'H'], description: 'Buscar e substituir' },
      { keys: ['Ctrl', 'P'], description: 'Buscar arquivo no vault (Quick Search)' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Paleta de comandos' },
      { keys: ['Ctrl', '?'], description: 'Mostrar atalhos de teclado (este painel)' },
    ]
  },
  {
    title: 'Formatação de Texto',
    items: [
      { keys: ['Ctrl', 'B'], description: 'Negrito' },
      { keys: ['Ctrl', 'I'], description: 'Itálico' },
      { keys: ['Ctrl', 'U'], description: 'Sublinhado' },
      { keys: ['Shift', 'Ctrl', '1'], description: 'Título 1 (H1)' },
      { keys: ['Shift', 'Ctrl', '2'], description: 'Título 2 (H2)' },
      { keys: ['Shift', 'Ctrl', '3'], description: 'Título 3 (H3)' },
      { keys: ['Shift', 'Ctrl', '4'], description: 'Título 4 (H4)' },
      { keys: ['Shift', 'Ctrl', '0'], description: 'Parágrafo normal' },
      { keys: ['Shift', 'Ctrl', '\\'], description: 'Bloco de código' },
      { keys: ['Ctrl', '>'], description: 'Citação (blockquote)' },
    ]
  },
  {
    title: 'Listas',
    items: [
      { keys: ['Tab'], description: 'Indentar item de lista' },
      { keys: ['Shift', 'Tab'], description: 'Diminuir indentação' },
      { keys: ['Ctrl', ']'], description: 'Aumentar indentação (lista)' },
      { keys: ['Ctrl', '['], description: 'Diminuir indentação (lista)' },
      { keys: ['Shift', 'Enter'], description: 'Quebra de linha sem novo parágrafo' },
    ]
  },
  {
    title: 'Inserção Rápida',
    items: [
      { keys: ['Ctrl', 'Alt', 'T'], description: 'Inserir tabela' },
      { keys: ['/'], description: 'Menu de inserção rápida (slash commands)' },
      { keys: ['[', '['], description: 'Inserir wiki link ([[note]])' },
      { keys: ['Ctrl', 'Space'], description: 'Abrir sugestões de wiki link' },
    ]
  },
  {
    title: 'Interface',
    items: [
      { keys: ['Ctrl', 'Scroll'], description: 'Zoom in / Zoom out' },
      { keys: ['Ctrl', 'Alt', 'B'], description: 'Alternar sidebar esquerda' },
      { keys: ['Ctrl', 'Alt', 'R'], description: 'Alternar sidebar direita' },
    ]
  },
  {
    title: 'Input Rules (auto)',
    items: [
      { keys: ['#', ' '], description: 'Título H1 (##  para H2, etc.)' },
      { keys: ['-', ' '], description: 'Lista com marcadores' },
      { keys: ['1', '.', ' '], description: 'Lista numerada' },
      { keys: ['[', ' ', ']', ' '], description: 'Item de tarefa (task list)' },
      { keys: ['>', ' '], description: 'Citação' },
      { keys: ['`', '`', '`'], description: 'Bloco de código' },
      { keys: ['-', '-', '-'], description: 'Linha horizontal' },
    ]
  }
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 text-[10px] font-mono bg-[#1a1a1a] border border-[#444] rounded text-[#ccc] shadow-[0_1px_0_rgba(0,0,0,0.5)]">
      {children}
    </kbd>
  )
}

export function ShortcutsModal() {
  const { shortcutsOpen, toggleShortcuts } = useUIStore()

  if (!shortcutsOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={toggleShortcuts}
    >
      <div
        className="w-[700px] max-h-[80vh] bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3a3a3a] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[#e0e0e0]">Atalhos de Teclado</h2>
            <p className="text-[11px] text-[#666] mt-0.5">Todos os atalhos disponíveis no NoteChaps</p>
          </div>
          <button
            onClick={toggleShortcuts}
            className="text-[#555] hover:text-[#aaa] text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[#3a3a3a] transition-colors"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-6">
            {shortcuts.map(section => (
              <div key={section.title}>
                <h3 className="text-[11px] font-semibold text-[#4a9eff] uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="flex flex-col gap-1">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-1">
                      <span className="text-[12px] text-[#aaa] flex-1">{item.description}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.keys.map((k, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            <Kbd>{k}</Kbd>
                            {ki < item.keys.length - 1 && (
                              <span className="text-[10px] text-[#555]">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3a3a3a] flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-[#555]">Pressione <Kbd>Esc</Kbd> para fechar</span>
          <span className="text-[11px] text-[#555]">Ctrl+? para abrir a qualquer momento</span>
        </div>
      </div>
    </div>
  )
}
