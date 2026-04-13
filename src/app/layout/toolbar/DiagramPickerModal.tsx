import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { diagramTemplates, categoryLabels, DiagramTemplate } from '../../../editor/templates/diagramTemplates'
import { initMermaid } from '../../../editor/modes/nodeViews/DiagramView'

interface Props {
  onSelect: (code: string) => void
  onClose: () => void
}

type Category = DiagramTemplate['category']

const CATEGORIES = Object.keys(categoryLabels) as Category[]

const CATEGORY_ICONS: Record<Category, string> = {
  fluxo: '→',
  sequencia: '⟷',
  arquitetura: '◻',
  banco: '⊟',
  planejamento: '▦',
}

let renderCounter = 0

// ─── Template card with rendered SVG preview ─────────────────────────────────

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: DiagramTemplate
  selected: boolean
  onSelect: () => void
}) {
  const [svg, setSvg]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setLoading(true)
    setSvg(null)
    initMermaid()
    const id = `picker-${++renderCounter}`
    mermaid.render(id, template.code).then(({ svg: s }) => {
      if (mounted.current) { setSvg(s); setLoading(false) }
    }).catch(() => {
      if (mounted.current) { setSvg(null); setLoading(false) }
    })
    return () => { mounted.current = false }
  }, [template.id])

  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-lg border transition-all overflow-hidden group ${
        selected
          ? 'border-[#4a9eff] bg-[#094771]'
          : 'border-[#3a3a3a] bg-[#1e1e1e] hover:border-[#555] hover:bg-[#252525]'
      }`}
    >
      {/* SVG Preview */}
      <div className="h-[130px] flex items-center justify-center bg-[#141414] overflow-hidden border-b border-[#2a2a2a]">
        {loading ? (
          <span className="text-[#444] text-[11px]">Carregando...</span>
        ) : svg ? (
          <div
            className="diagram-picker-preview"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <span className="text-[#444] text-[11px]">Sem preview</span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className={`text-[12px] font-semibold mb-0.5 transition-colors ${selected ? 'text-white' : 'text-[#e0e0e0] group-hover:text-white'}`}>
          {template.label}
        </div>
        <div className="text-[10px] text-[#666] leading-relaxed">{template.description}</div>
        <div className={`text-[10px] font-mono mt-1 ${selected ? 'text-[#4a9eff]' : 'text-[#444]'}`}>
          {template.slashCommand}
        </div>
      </div>
    </button>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function DiagramPickerModal({ onSelect, onClose }: Props) {
  const [category, setCategory]       = useState<Category>('fluxo')
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  const filtered = diagramTemplates.filter(t => t.category === category)

  // Reset selection when category changes
  useEffect(() => { setSelectedId(null) }, [category])

  const handleInsert = () => {
    const template = filtered.find(t => t.id === selectedId) ?? filtered[0]
    if (template) { onSelect(template.code); onClose() }
  }

  return (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-[740px] max-h-[86vh] flex flex-col bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[#e0e0e0]">Inserir Diagrama</h2>
            <p className="text-[11px] text-[#555] mt-0.5">Selecione um template para inserir no documento</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#aaa] text-xl leading-none transition-colors">×</button>
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-[#2a2a2a] px-1 shrink-0 bg-[#1a1a1a]">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors border-b-2 ${
                category === cat
                  ? 'text-[#4a9eff] border-[#4a9eff]'
                  : 'text-[#666] border-transparent hover:text-[#aaa]'
              }`}
            >
              <span className="text-[13px] opacity-80">{CATEGORY_ICONS[cat]}</span>
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedId === template.id}
                onSelect={() => setSelectedId(template.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2a2a2a] flex items-center justify-between shrink-0 bg-[#1a1a1a]">
          <span className="text-[11px] text-[#555]">
            Dica: use <kbd className="bg-[#252525] border border-[#333] px-1.5 py-0.5 rounded font-mono text-[10px]">
              {filtered.find(t => t.id === selectedId)?.slashCommand ?? filtered[0]?.slashCommand ?? '/diagrama'}
            </kbd> no editor para inserir diretamente
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 rounded text-[12px] text-[#aaa] hover:text-[#e0e0e0] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleInsert}
              className="px-5 py-1.5 rounded bg-[#4a9eff] text-white text-[12px] font-semibold hover:bg-[#3a8eef] transition-colors"
            >
              Inserir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
