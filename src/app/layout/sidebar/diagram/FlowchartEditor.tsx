import React, { useEffect, useMemo, useState } from 'react'
import { FlowNode, FlowEdge, parseFlowchart, buildFlowchart } from './diagramEditorHelpers'

interface Props { code: string; onChange: (c: string) => void }

export function FlowchartEditor({ code, onChange }: Props) {
  const parsed = useMemo(() => parseFlowchart(code), [code])
  const [direction, setDirection] = useState(parsed.direction)
  const [nodes, setNodes]         = useState<FlowNode[]>(parsed.nodes)
  const [edges, setEdges]         = useState<FlowEdge[]>(parsed.edges)
  const [newEdge, setNewEdge]     = useState<FlowEdge>({ from: '', to: '', label: '', style: '-->' })

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

  return (
    <div className="p-3 space-y-4">
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
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Nós ({nodes.length})</EditorLabel>
          <button
            onClick={() => setNodes(ns => [...ns, { id: `N${ns.length + 1}`, label: 'Novo Nó', shape: 'rect' }])}
            className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-1.5">
          {nodes.map((n, i) => (
            <div key={n.id} className="flex items-center gap-1.5 bg-[#1e1e1e] px-2 py-1.5 rounded border border-[#333]">
              <span className="text-[10px] text-[#555] font-mono w-6 shrink-0">{n.id}</span>
              <input
                value={n.label}
                onChange={e => updateNode(i, { label: e.target.value })}
                className="flex-1 min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[12px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
              />
              <select
                value={n.shape}
                onChange={e => updateNode(i, { shape: e.target.value as FlowNode['shape'] })}
                className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
              >
                <option value="rect">□ Retângulo</option>
                <option value="round">○ Arredondado</option>
                <option value="diamond">◇ Decisão</option>
                <option value="stadium">⬭ Stadium</option>
              </select>
              <button onClick={() => removeNode(i)} className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Connections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Conexões ({edges.length})</EditorLabel>
        </div>
        <div className="space-y-1.5 mb-2">
          {edges.map((e, i) => (
            <div key={i} className="bg-[#1e1e1e] px-2 py-2 rounded border border-[#333] space-y-1.5">
              {/* Row 1: from / style / to / delete */}
              <div className="grid gap-1" style={{ gridTemplateColumns: '1fr auto 1fr auto' }}>
                <NodeSelect value={e.from} onChange={v => updateEdge(i, { from: v })} nodes={nodes} placeholder="De" />
                <select
                  value={e.style}
                  onChange={ev => updateEdge(i, { style: ev.target.value as FlowEdge['style'] })}
                  className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1 py-1 rounded border border-[#3a3a3a] outline-none"
                >
                  <option value="-->">→</option>
                  <option value="--->">⟶</option>
                  <option value="-.->">⤳</option>
                </select>
                <NodeSelect value={e.to} onChange={v => updateEdge(i, { to: v })} nodes={nodes} placeholder="Para" />
                <button
                  onClick={() => setEdges(es => es.filter((_, idx) => idx !== i))}
                  className="text-[#555] hover:text-[#ff6b6b] transition-colors px-1"
                >×</button>
              </div>
              {/* Row 2: label */}
              <input
                value={e.label}
                onChange={ev => updateEdge(i, { label: ev.target.value })}
                placeholder="Texto da conexão (opcional)"
                className="w-full bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
              />
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] p-2.5 rounded border border-[#333] space-y-2">
          <EditorLabel>Nova Conexão</EditorLabel>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <NodeSelect value={newEdge.from} onChange={v => setNewEdge(s => ({ ...s, from: v }))} nodes={nodes} placeholder="De" />
            <select
              value={newEdge.style}
              onChange={e => setNewEdge(s => ({ ...s, style: e.target.value as FlowEdge['style'] }))}
              className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1 py-1 rounded border border-[#3a3a3a] outline-none"
            >
              <option value="-->">→</option>
              <option value="--->">⟶</option>
              <option value="-.->">⤳</option>
            </select>
            <NodeSelect value={newEdge.to} onChange={v => setNewEdge(s => ({ ...s, to: v }))} nodes={nodes} placeholder="Para" />
          </div>
          <div className="flex gap-1.5">
            <input
              value={newEdge.label}
              onChange={e => setNewEdge(s => ({ ...s, label: e.target.value }))}
              placeholder="Texto do link (opcional)"
              className="flex-1 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
            />
            <button
              onClick={addEdge}
              disabled={!newEdge.from || !newEdge.to}
              className="px-3 py-1 rounded bg-[#4a9eff] text-white text-[11px] font-medium disabled:opacity-40 hover:bg-[#3a8eef] transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NodeSelect({ value, onChange, nodes, placeholder }: {
  value: string; onChange: (v: string) => void; nodes: FlowNode[]; placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
    >
      <option value="">{placeholder}</option>
      {nodes.map(n => <option key={n.id} value={n.id}>{n.id}: {n.label}</option>)}
    </select>
  )
}

function EditorLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}
