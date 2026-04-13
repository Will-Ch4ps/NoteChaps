import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useEditorStore } from '../../../../store/editorStore'
import { schema } from '../../../../editor/core/schema'
import { initMermaid } from '../../../../editor/modes/nodeViews/DiagramView'
import { detectDiagramType, DIAGRAM_TYPE_LABELS } from './diagramEditorHelpers'
import { FlowchartEditor } from './FlowchartEditor'
import { SequenceEditor } from './SequenceEditor'
import { ErEditor } from './ErEditor'
import { GanttEditor } from './GanttEditor'

let previewCounter = 0

export function DiagramPanel() {
  const { activeDiagram, activeView, setActiveDiagram } = useEditorStore()
  const [code, setCode]           = useState(activeDiagram?.code ?? '')
  const [previewSvg, setPreview]  = useState('')
  const [previewError, setError]  = useState('')
  const [showRaw, setShowRaw]     = useState(false)
  const previewTimer              = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when active diagram changes
  useEffect(() => {
    setCode(activeDiagram?.code ?? '')
    setPreview(''); setError('')
  }, [activeDiagram])

  // Debounced live preview
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    if (!code.trim()) { setPreview(''); setError(''); return }
    previewTimer.current = setTimeout(async () => {
      initMermaid()
      try {
        const { svg } = await mermaid.render(`dp-${++previewCounter}`, code.trim())
        setPreview(svg); setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setPreview('')
      }
    }, 600)
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current) }
  }, [code])

  const handleApply = () => {
    if (!activeDiagram || !activeView) return
    const newNode = schema.nodes.code_block.create(
      { language: 'mermaid' },
      code.trim() ? schema.text(code.trim()) : undefined
    )
    // Walk the doc to find the exact node bounds (avoids stale pos bug)
    const doc = activeView.state.doc
    let start = activeDiagram.pos
    let end   = activeDiagram.pos + 2
    doc.nodesBetween(0, doc.content.size, (n, pos) => {
      if (pos === activeDiagram.pos) { start = pos; end = pos + n.nodeSize; return false }
      return true
    })
    activeView.dispatch(activeView.state.tr.replaceWith(start, end, newNode))
    setActiveDiagram({ ...activeDiagram, code: code.trim() })
    activeView.focus()
  }

  if (!activeDiagram) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="text-5xl opacity-20">◇</div>
        <p className="text-[#858585] text-[12px] leading-relaxed">
          Clique em <strong className="text-[#cccccc]">✏ Editar</strong> em qualquer diagrama para abrir o editor aqui.
        </p>
      </div>
    )
  }

  const type = detectDiagramType(code)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header bar */}
      <div className="px-3 py-2 border-b border-[#3e3e42] flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide flex-1">
          {DIAGRAM_TYPE_LABELS[type]}
        </span>
        <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">{type}</span>
        <button onClick={() => setActiveDiagram(null)} className="text-[#555] hover:text-[#aaa] text-lg leading-none transition-colors">×</button>
      </div>

      {/* Preview pane */}
      <div className="border-b border-[#3e3e42] bg-[#1c1c1e] diagram-sidebar-preview shrink-0">
        {previewError
          ? <div className="text-[10px] text-[#ff6b6b] p-3 font-mono break-all leading-relaxed overflow-auto max-h-[160px]">{previewError}</div>
          : previewSvg
            ? <div className="diagram-sidebar-svg" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            : <div className="flex items-center justify-center h-full text-[#555] text-[11px]">Pré-visualização...</div>
        }
      </div>

      {/* Visual editor (scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {type === 'flowchart' && <FlowchartEditor code={code} onChange={setCode} />}
        {type === 'sequence'  && <SequenceEditor  code={code} onChange={setCode} />}
        {type === 'er'        && <ErEditor         code={code} onChange={setCode} />}
        {type === 'gantt'     && <GanttEditor      code={code} onChange={setCode} />}
        {type === 'unknown'   && (
          <div className="p-3">
            <p className="text-[11px] text-[#858585] mb-2">Tipo não reconhecido — edite o código diretamente:</p>
            <RawEditor value={code} onChange={setCode} rows={12} />
          </div>
        )}

        {/* Collapsible raw code */}
        {type !== 'unknown' && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setShowRaw(v => !v)}
              className="text-[11px] text-[#555] hover:text-[#aaa] flex items-center gap-1 transition-colors mb-1.5"
            >
              <span>{showRaw ? '▾' : '▸'}</span>
              <span>Código Mermaid (modo avançado)</span>
            </button>
            {showRaw && <RawEditor value={code} onChange={setCode} rows={10} />}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-3 py-2.5 border-t border-[#3e3e42] flex gap-2 shrink-0">
        <button
          onClick={handleApply}
          className="flex-1 py-1.5 rounded bg-[#4a9eff] text-white text-[12px] font-semibold hover:bg-[#3a8eef] transition-colors"
        >
          Aplicar no Documento
        </button>
        <button
          onClick={() => setActiveDiagram(null)}
          className="px-3 py-1.5 rounded bg-[#2a2a2a] text-[#aaa] text-[12px] hover:bg-[#333] transition-colors border border-[#3a3a3a]"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

function RawEditor({ value, onChange, rows }: { value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      spellCheck={false}
      rows={rows}
      className="w-full bg-[#1a1a1a] text-[#e0e0e0] font-mono text-[11px] p-2 rounded border border-[#3a3a3a] outline-none resize-none focus:border-[#4a9eff] transition-colors scrollbar-thin leading-relaxed"
    />
  )
}
