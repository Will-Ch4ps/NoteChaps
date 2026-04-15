import React, { useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useEditorStore } from '../../../../store/editorStore'
import { schema } from '../../../../editor/core/schema'
import { initMermaid } from '../../../../editor/modes/nodeViews/DiagramView'
import { detectDiagramType, DIAGRAM_TYPE_LABELS, DiagramType, getMermaidRenderCode } from '../../../../shared/mermaid'
import { FlowchartEditor } from './FlowchartEditor'
import { SequenceEditor } from './SequenceEditor'
import { ErEditor } from './ErEditor'
import { GanttEditor } from './GanttEditor'

let previewCounter = 0

const ADVANCED_TYPES = new Set<DiagramType>([
  'state',
  'class',
  'journey',
  'pie',
  'gitgraph',
  'mindmap',
  'timeline',
  'quadrant',
  'requirement',
  'sankey',
  'unknown'
])

const SNIPPETS: Partial<Record<DiagramType, Array<{ label: string; code: string }>>> = {
  state: [
    { label: 'Novo estado', code: 'state NewState' },
    { label: 'Transicao', code: 'pending --> received : pagamento completo' },
    { label: 'Inicio/Fim', code: '[*] --> pending\nreceived --> [*]' }
  ],
  class: [
    { label: 'Nova classe', code: 'class User {\n  +String name\n  +login()\n}' },
    { label: 'Relacao', code: 'User "1" --> "*" Order : creates' }
  ],
  journey: [
    { label: 'Nova secao', code: 'section Checkout' },
    { label: 'Nova etapa', code: 'Pay cart: 5: User, Gateway' }
  ],
  pie: [
    { label: 'Nova fatia', code: '"Categoria" : 42' },
    { label: 'Mostrar dados', code: 'showData' }
  ],
  gitgraph: [
    { label: 'Commit', code: 'commit id:"feat-login"' },
    { label: 'Branch', code: 'branch release' },
    { label: 'Merge', code: 'merge release' }
  ],
  mindmap: [
    { label: 'No filho', code: '  Child topic' },
    { label: 'No neto', code: '    Sub topic' }
  ],
  timeline: [
    { label: 'Marco', code: '2026 : MVP em producao' },
    { label: 'Detalhe', code: '      : Melhorias no editor' }
  ],
  quadrant: [
    { label: 'Ponto', code: '"Velocidade" : [0.82, 0.34]' },
    { label: 'Titulo', code: 'title Priorizacao de tarefas' }
  ],
  requirement: [
    { label: 'Requirement', code: 'requirement Req1 {\n  id: R1\n  text: O app deve abrir em menos de 2s\n  risk: medium\n  verifymethod: test\n}' },
    { label: 'Relacao', code: 'Req1 - satisfies -> Req2' }
  ],
  sankey: [
    { label: 'Fluxo', code: 'Users,Docs,120' },
    { label: 'Fluxo 2', code: 'Docs,Insights,80' }
  ],
  unknown: [
    { label: 'Flowchart base', code: 'flowchart TD\n  A[Start] --> B[End]' },
    { label: 'State base', code: 'stateDiagram-v2\n  [*] --> pending\n  pending --> done\n  done --> [*]' },
    { label: 'Sequence base', code: 'sequenceDiagram\n  Client->>API: request\n  API-->>Client: response' }
  ]
}

export function DiagramPanel() {
  const { activeDiagram, activeView, setActiveDiagram } = useEditorStore()
  const [code, setCode] = useState(activeDiagram?.code ?? '')
  const [previewSvg, setPreview] = useState('')
  const [previewError, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCode(activeDiagram?.code ?? '')
    setPreview('')
    setError('')
  }, [activeDiagram])

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    if (!code.trim()) {
      setPreview('')
      setError('')
      return
    }

    previewTimer.current = setTimeout(async () => {
      initMermaid()
      const previewCode = getMermaidRenderCode(activeDiagram?.language ?? 'mermaid', code)
      try {
        const { svg } = await mermaid.render(`dp-${++previewCounter}`, previewCode.trim())
        setPreview(svg)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setPreview('')
      }
    }, 600)

    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
    }
  }, [code, activeDiagram?.language])

  const handleApply = () => {
    if (!activeDiagram || !activeView) return

    const normalizedCode = getMermaidRenderCode(activeDiagram.language ?? 'mermaid', code).trim()
    const newNode = schema.nodes.code_block.create(
      { language: 'mermaid' },
      normalizedCode ? schema.text(normalizedCode) : undefined
    )

    const doc = activeView.state.doc
    let start = activeDiagram.pos
    let end = activeDiagram.pos + 2

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
      if (pos === activeDiagram.pos) {
        start = pos
        end = pos + node.nodeSize
        return false
      }
      return true
    })

    activeView.dispatch(activeView.state.tr.replaceWith(start, end, newNode))
    setActiveDiagram({ ...activeDiagram, code: normalizedCode, language: 'mermaid' })
    activeView.focus()
  }

  if (!activeDiagram) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="text-5xl opacity-20">◇</div>
        <p className="text-[#858585] text-[12px] leading-relaxed">
          Clique em <strong className="text-[#cccccc]">Edit</strong> em qualquer diagrama para abrir o editor aqui.
        </p>
      </div>
    )
  }

  const type = detectDiagramType(code, activeDiagram.language)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-[#3e3e42] flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide flex-1">
          {DIAGRAM_TYPE_LABELS[type]}
        </span>
        <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">{type}</span>
        <button onClick={() => setActiveDiagram(null)} className="text-[#555] hover:text-[#aaa] text-lg leading-none transition-colors">×</button>
      </div>

      <div className="border-b border-[#3e3e42] bg-[#1c1c1e] diagram-sidebar-preview shrink-0">
        {previewError
          ? <div className="text-[10px] text-[#ff6b6b] p-3 font-mono break-all leading-relaxed overflow-auto max-h-[160px]">{previewError}</div>
          : previewSvg
            ? <div className="diagram-sidebar-svg" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            : <div className="flex items-center justify-center h-full text-[#555] text-[11px]">Pre-visualizacao...</div>
        }
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin min-w-0">
        {type === 'flowchart' && <FlowchartEditor code={code} onChange={setCode} />}
        {type === 'sequence' && <SequenceEditor code={code} onChange={setCode} />}
        {type === 'er' && <ErEditor code={code} onChange={setCode} />}
        {type === 'gantt' && <GanttEditor code={code} onChange={setCode} />}
        {ADVANCED_TYPES.has(type) && <GenericMermaidEditor type={type} code={code} onChange={setCode} />}

        {type !== 'unknown' && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setShowRaw((value) => !value)}
              className="text-[11px] text-[#555] hover:text-[#aaa] flex items-center gap-1 transition-colors mb-1.5"
            >
              <span>{showRaw ? '▾' : '▸'}</span>
              <span>Codigo Mermaid (modo avancado)</span>
            </button>
            {showRaw && <RawEditor value={code} onChange={setCode} rows={10} />}
          </div>
        )}
      </div>

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

function GenericMermaidEditor({ type, code, onChange }: { type: DiagramType; code: string; onChange: (value: string) => void }) {
  const snippets = useMemo(() => SNIPPETS[type] ?? SNIPPETS.unknown ?? [], [type])

  const appendSnippet = (snippet: string) => {
    const next = code.trimEnd()
    onChange(next ? `${next}\n${snippet}` : snippet)
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-[11px] text-[#858585]">
        Editor rapido para {DIAGRAM_TYPE_LABELS[type]}. Use os blocos abaixo para montar o diagrama sem precisar lembrar toda a sintaxe.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {snippets.map((snippet) => (
          <button
            key={snippet.label}
            onClick={() => appendSnippet(snippet.code)}
            className="text-[11px] px-2 py-1 rounded border border-[#3a3a3a] text-[#aaa] hover:border-[#4a9eff] hover:text-[#4a9eff] transition-colors"
          >
            + {snippet.label}
          </button>
        ))}
      </div>
      <RawEditor value={code} onChange={onChange} rows={14} />
    </div>
  )
}

function RawEditor({ value, onChange, rows }: { value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      rows={rows}
      className="w-full bg-[#1a1a1a] text-[#e0e0e0] font-mono text-[11px] p-2 rounded border border-[#3a3a3a] outline-none resize-none focus:border-[#4a9eff] transition-colors scrollbar-thin leading-relaxed"
    />
  )
}
