import React, { useEffect, useMemo, useState } from 'react'
import {
  FlowNode,
  FlowEdge,
  FlowShape,
  SHAPE_OPTIONS,
  COLOR_PRESETS,
  parseFlowchart,
  buildFlowchart,
} from './diagramEditorHelpers'

interface Props { code: string; onChange: (c: string) => void }

export function FlowchartEditor({ code, onChange }: Props) {
  const parsed = useMemo(() => parseFlowchart(code), [code])
  const [direction, setDirection] = useState(parsed.direction)
  const [nodes, setNodes]         = useState<FlowNode[]>(parsed.nodes)
  const [edges, setEdges]         = useState<FlowEdge[]>(parsed.edges)
  const [newEdge, setNewEdge]     = useState<FlowEdge>({ from: '', to: '', label: '', style: '-->' })
  const [showHelp, setShowHelp]   = useState(false)
  const [expandedNode, setExpandedNode] = useState<number | null>(null)

  useEffect(() => { onChange(buildFlowchart(direction, nodes, edges)) }, [direction, nodes, edges])

  const updateNode = (i: number, patch: Partial<FlowNode>) =>
    setNodes(ns => ns.map((n, idx) => idx === i ? { ...n, ...patch } : n))

  const removeNode = (i: number) => {
    const id = nodes[i].id
    setNodes(ns => ns.filter((_, idx) => idx !== i))
    setEdges(es => es.filter(e => e.from !== id && e.to !== id))
  }

  const updateEdge = (i: number, patch: Partial<FlowEdge>) =>
    setEdges(es => es.map((e, idx) => idx === i ? { ...e, ...patch } : e))

  const addEdge = () => {
    if (!newEdge.from || !newEdge.to) return
    setEdges(es => [...es, { ...newEdge }])
    setNewEdge({ from: '', to: '', label: '', style: '-->' })
  }

  const applyColorPreset = (i: number, preset: typeof COLOR_PRESETS[0]) => {
    updateNode(i, {
      fill: preset.fill || undefined,
      stroke: preset.stroke || undefined,
      textColor: preset.textColor || undefined,
    })
  }

  return (
    <div className="p-3 space-y-4 min-w-0">
      {/* Help banner */}
      <div className="bg-[#1a2332] border border-[#2a4a6a] rounded p-2 text-[11px] text-[#aaa]">
        <button
          onClick={() => setShowHelp(v => !v)}
          className="flex items-center gap-1.5 text-[#4a9eff] hover:text-[#6ab0ff] transition-colors font-semibold"
        >
          <span>{showHelp ? '▼' : '▶'}</span>
          <span>Como editar o fluxograma</span>
        </button>
        {showHelp && (
          <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed">
            <p><strong className="text-[#ccc]">Quebra de linha:</strong> pressione <kbd className="px-1 bg-[#2a2a2a] rounded">Enter</kbd> dentro de qualquer campo de texto (nó ou conexão).</p>
            <p><strong className="text-[#ccc]">Mudar forma:</strong> seletor ao lado do nó — hexágono, losango, cilindro, etc.</p>
            <p><strong className="text-[#ccc]">Cores:</strong> clique em 🎨 para ver presets e um seletor de cor personalizado (gradiente).</p>
            <p><strong className="text-[#ccc]">Formas crescem com o texto</strong> — não há corte, escreva à vontade.</p>
          </div>
        )}
      </div>

      {/* Direction */}
      <div>
        <EditorLabel>Direção</EditorLabel>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {(['TD', 'LR', 'BT', 'RL'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                direction === d
                  ? 'bg-[#4a9eff] text-white border-[#4a9eff]'
                  : 'bg-[#1a1a1a] text-[#aaa] border-[#3a3a3a] hover:border-[#555]'
              }`}
              title={`Direção: ${d === 'TD' ? 'Topo → Base' : d === 'LR' ? 'Esquerda → Direita' : d === 'BT' ? 'Base → Topo' : 'Direita → Esquerda'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Nós ({nodes.length})</EditorLabel>
          <button
            onClick={() => setNodes(ns => [...ns, { id: `N${ns.length + 1}`, label: 'Novo Nó', shape: 'rect' }])}
            className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {nodes.map((n, i) => {
            const isExpanded = expandedNode === i
            return (
              <div key={n.id} className="bg-[#1e1e1e] rounded border border-[#333] min-w-0">
                <div className="px-2 py-2 space-y-1.5 min-w-0">
                  {/* Row 1: id badge + shape + color btn + delete btn */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-[#666] font-mono bg-[#252525] px-1.5 py-0.5 rounded shrink-0">{n.id}</span>
                    <select
                      value={n.shape}
                      onChange={e => updateNode(i, { shape: e.target.value as FlowShape })}
                      className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
                      title="Forma do nó"
                    >
                      {SHAPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpandedNode(isExpanded ? null : i)}
                      className={`text-[13px] transition-colors shrink-0 px-1.5 py-0.5 rounded ${isExpanded ? 'text-[#4a9eff] bg-[#1a2a3a]' : 'text-[#555] hover:text-[#aaa]'}`}
                      title="Cor do nó"
                    >🎨</button>
                    <button
                      onClick={() => removeNode(i)}
                      className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0 px-1.5"
                      title="Remover nó"
                    >×</button>
                  </div>
                  {/* Row 2: label textarea (full width) */}
                  <textarea
                    value={n.label}
                    onChange={e => updateNode(i, { label: e.target.value })}
                    rows={Math.max(2, n.label.split('\n').length)}
                    className="w-full min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[12px] px-2 py-1.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff] resize-y font-sans leading-snug"
                    placeholder="Texto do nó (Enter para nova linha)"
                  />
                </div>
                {isExpanded && (
                  <div className="border-t border-[#333] px-2 py-2 space-y-2">
                    <div>
                      <p className="text-[10px] text-[#666] uppercase tracking-wide mb-1">Presets</p>
                      <div className="flex flex-wrap gap-1">
                        {COLOR_PRESETS.map(preset => (
                          <button
                            key={preset.name}
                            onClick={() => applyColorPreset(i, preset)}
                            className="px-2 py-1 rounded text-[10px] border transition-all hover:scale-105"
                            style={{
                              background: preset.fill || '#2a2a2a',
                              borderColor: preset.stroke || '#3a3a3a',
                              color: preset.textColor || '#aaa',
                            }}
                            title={preset.name}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#666] uppercase tracking-wide mb-1">Cor personalizada</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <ColorField
                          label="Fundo"
                          value={n.fill || '#2d2d2d'}
                          onChange={v => updateNode(i, { fill: v })}
                          onClear={() => updateNode(i, { fill: undefined })}
                        />
                        <ColorField
                          label="Borda"
                          value={n.stroke || '#4a4a4a'}
                          onChange={v => updateNode(i, { stroke: v })}
                          onClear={() => updateNode(i, { stroke: undefined })}
                        />
                        <ColorField
                          label="Texto"
                          value={n.textColor || '#e0e0e0'}
                          onChange={v => updateNode(i, { textColor: v })}
                          onClear={() => updateNode(i, { textColor: undefined })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Connections — stacked vertically so nothing is cut */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Conexões ({edges.length})</EditorLabel>
        </div>
        <div className="space-y-2 mb-2">
          {edges.map((e, i) => (
            <div key={i} className="bg-[#1e1e1e] px-2 py-2 rounded border border-[#333] space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">De</span>
                <NodeSelect value={e.from} onChange={v => updateEdge(i, { from: v })} nodes={nodes} placeholder="Origem" />
                <button
                  onClick={() => setEdges(es => es.filter((_, idx) => idx !== i))}
                  className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0 px-1.5"
                  title="Remover conexão"
                >×</button>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Tipo</span>
                <select
                  value={e.style}
                  onChange={ev => updateEdge(i, { style: ev.target.value as FlowEdge['style'] })}
                  className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
                  title="Estilo da seta"
                >
                  <option value="-->">→ Normal</option>
                  <option value="--->">⟶ Longa</option>
                  <option value="-.->">⤳ Pontilhada</option>
                  <option value="==>">⇒ Grossa</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Para</span>
                <NodeSelect value={e.to} onChange={v => updateEdge(i, { to: v })} nodes={nodes} placeholder="Destino" />
              </div>
              <textarea
                value={e.label}
                onChange={ev => updateEdge(i, { label: ev.target.value })}
                placeholder="Texto da conexão (Enter = nova linha)"
                rows={Math.max(2, e.label.split('\n').length)}
                className="w-full min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff] resize-y font-sans leading-snug"
              />
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] p-2.5 rounded border border-[#333] space-y-1.5 min-w-0">
          <EditorLabel>Nova Conexão</EditorLabel>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">De</span>
            <NodeSelect value={newEdge.from} onChange={v => setNewEdge(s => ({ ...s, from: v }))} nodes={nodes} placeholder="Origem" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Tipo</span>
            <select
              value={newEdge.style}
              onChange={e => setNewEdge(s => ({ ...s, style: e.target.value as FlowEdge['style'] }))}
              className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
            >
              <option value="-->">→ Normal</option>
              <option value="--->">⟶ Longa</option>
              <option value="-.->">⤳ Pontilhada</option>
              <option value="==>">⇒ Grossa</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Para</span>
            <NodeSelect value={newEdge.to} onChange={v => setNewEdge(s => ({ ...s, to: v }))} nodes={nodes} placeholder="Destino" />
          </div>
          <div className="flex gap-1.5 min-w-0">
            <input
              value={newEdge.label}
              onChange={e => setNewEdge(s => ({ ...s, label: e.target.value }))}
              placeholder="Texto (opcional)"
              className="flex-1 min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
            />
            <button
              onClick={addEdge}
              disabled={!newEdge.from || !newEdge.to}
              className="px-3 py-1 rounded bg-[#4a9eff] text-white text-[11px] font-medium disabled:opacity-40 hover:bg-[#3a8eef] transition-colors shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange, onClear }: {
  label: string
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[9px] text-[#888] uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-7 rounded border border-[#3a3a3a] bg-transparent cursor-pointer shrink-0"
          style={{ padding: 0 }}
        />
        <button
          onClick={onClear}
          className="text-[9px] text-[#666] hover:text-[#aaa] transition-colors"
          title="Resetar para padrão"
        >×</button>
      </div>
    </label>
  )
}

function NodeSelect({ value, onChange, nodes, placeholder }: {
  value: string; onChange: (v: string) => void; nodes: FlowNode[]; placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
    >
      <option value="">{placeholder}</option>
      {nodes.map(n => {
        const preview = n.label.replace(/\n/g, ' ').slice(0, 30)
        return <option key={n.id} value={n.id}>{n.id}: {preview}</option>
      })}
    </select>
  )
}

function EditorLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}
