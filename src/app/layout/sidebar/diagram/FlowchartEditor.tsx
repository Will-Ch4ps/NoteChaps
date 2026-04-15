import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FlowNode,
  FlowEdge,
  FlowShape,
  FlowGroup,
  SHAPE_OPTIONS,
  COLOR_PRESETS,
  parseFlowchart,
  buildFlowchart,
} from './diagramEditorHelpers'

interface Props { code: string; onChange: (c: string) => void }

export function FlowchartEditor({ code, onChange }: Props) {
  const parsed = useMemo(() => parseFlowchart(code), [code])
  const [direction, setDirection] = useState(parsed.direction)
  const [nodes, setNodes] = useState<FlowNode[]>(parsed.nodes)
  const [edges, setEdges] = useState<FlowEdge[]>(parsed.edges)
  const [groups, setGroups] = useState<FlowGroup[]>(parsed.groups)
  const lastSerializedRef = useRef('')
  const [newEdge, setNewEdge] = useState<FlowEdge>({ from: '', to: '', label: '', style: '-->' })
  const [showHelp, setShowHelp] = useState(false)
  const [expandedNode, setExpandedNode] = useState<number | null>(null)

  useEffect(() => {
    const serialized = buildFlowchart(direction, nodes, edges, groups)
    lastSerializedRef.current = serialized
    onChange(serialized)
  }, [direction, nodes, edges, groups])

  useEffect(() => {
    if (code === lastSerializedRef.current) return
    setDirection(parsed.direction)
    setNodes(parsed.nodes)
    setEdges(parsed.edges)
    setGroups(parsed.groups)
  }, [code, parsed])

  const updateNode = (i: number, patch: Partial<FlowNode>) =>
    setNodes((ns) => ns.map((n, idx) => (idx === i ? { ...n, ...patch } : n)))

  const removeNode = (i: number) => {
    const id = nodes[i].id
    setNodes((ns) => ns.filter((_, idx) => idx !== i))
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    setGroups((gs) => gs.map((g) => ({ ...g, nodeIds: g.nodeIds.filter((nodeId) => nodeId !== id) })))
  }

  const updateEdge = (i: number, patch: Partial<FlowEdge>) =>
    setEdges((es) => es.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))

  const addEdge = () => {
    if (!newEdge.from || !newEdge.to) return
    setEdges((es) => [...es, { ...newEdge }])
    setNewEdge({ from: '', to: '', label: '', style: '-->' })
  }

  const updateGroup = (groupId: string, patch: Partial<FlowGroup>) =>
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, ...patch } : g)))

  const addGroup = () => {
    const next = groups.length + 1
    setGroups((gs) => [...gs, { id: `GROUP${next}`, label: `Grupo ${next}`, nodeIds: [] }])
  }

  const removeGroup = (groupId: string) => {
    setGroups((gs) => gs.filter((g) => g.id !== groupId).map((g) => (g.parentId === groupId ? { ...g, parentId: undefined } : g)))
  }

  const toggleNodeInGroup = (groupId: string, nodeId: string) => {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== groupId) return g
        const exists = g.nodeIds.includes(nodeId)
        return { ...g, nodeIds: exists ? g.nodeIds.filter((id) => id !== nodeId) : [...g.nodeIds, nodeId] }
      })
    )
  }

  const applyColorPreset = (i: number, preset: typeof COLOR_PRESETS[0]) => {
    updateNode(i, {
      fill: preset.fill || undefined,
      stroke: preset.stroke || undefined,
      textColor: preset.textColor || undefined,
    })
  }

  const applyGroupColorPreset = (groupId: string, preset: typeof COLOR_PRESETS[0]) => {
    updateGroup(groupId, {
      fill: preset.fill || undefined,
      stroke: preset.stroke || undefined,
      textColor: preset.textColor || undefined,
    })
  }

  return (
    <div className="p-3 space-y-4 min-w-0">
      <div className="bg-[#1a2332] border border-[#2a4a6a] rounded p-2 text-[11px] text-[#aaa]">
        <button
          onClick={() => setShowHelp((value) => !value)}
          className="flex items-center gap-1.5 text-[#4a9eff] hover:text-[#6ab0ff] transition-colors font-semibold"
        >
          <span>{showHelp ? '▼' : '▶'}</span>
          <span>Como editar o fluxograma</span>
        </button>
        {showHelp && (
          <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed">
            <p><strong className="text-[#ccc]">Subgraph:</strong> use "Agrupamentos" para criar retangulos de contexto com cor (ex.: KVM, Docker).</p>
            <p><strong className="text-[#ccc]">Setas multiplas:</strong> linhas como "A --&gt; B &amp; C" sao preservadas no parser interno.</p>
            <p><strong className="text-[#ccc]">Quebra de linha:</strong> pressione <kbd className="px-1 bg-[#2a2a2a] rounded">Enter</kbd> nos campos de texto para nova linha.</p>
          </div>
        )}
      </div>

      <div>
        <EditorLabel>Direcao</EditorLabel>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {(['TD', 'LR', 'BT', 'RL'] as const).map((d) => (
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

      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Nos ({nodes.length})</EditorLabel>
          <button
            onClick={() => setNodes((ns) => [...ns, { id: `N${ns.length + 1}`, label: 'Novo no', shape: 'rect' }])}
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-[#666] font-mono bg-[#252525] px-1.5 py-0.5 rounded shrink-0">{n.id}</span>
                    <select
                      value={n.shape}
                      onChange={(e) => updateNode(i, { shape: e.target.value as FlowShape })}
                      className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
                    >
                      {SHAPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpandedNode(isExpanded ? null : i)}
                      className={`text-[13px] transition-colors shrink-0 px-1.5 py-0.5 rounded ${isExpanded ? 'text-[#4a9eff] bg-[#1a2a3a]' : 'text-[#555] hover:text-[#aaa]'}`}
                      title="Cor do no"
                    >🎨</button>
                    <button
                      onClick={() => removeNode(i)}
                      className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0 px-1.5"
                    >×</button>
                  </div>

                  <textarea
                    value={n.label}
                    onChange={(e) => updateNode(i, { label: e.target.value })}
                    rows={Math.max(2, n.label.split('\n').length)}
                    className="w-full min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[12px] px-2 py-1.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff] resize-y font-sans leading-snug"
                    placeholder="Texto do no"
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-[#333] px-2 py-2 space-y-2">
                    <div>
                      <p className="text-[10px] text-[#666] uppercase tracking-wide mb-1">Presets</p>
                      <div className="flex flex-wrap gap-1">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => applyColorPreset(i, preset)}
                            className="px-2 py-1 rounded text-[10px] border transition-all hover:scale-105"
                            style={{
                              background: preset.fill || '#2a2a2a',
                              borderColor: preset.stroke || '#3a3a3a',
                              color: preset.textColor || '#aaa',
                            }}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <ColorField
                        label="Fundo"
                        value={n.fill || '#2d2d2d'}
                        onChange={(v) => updateNode(i, { fill: v })}
                        onClear={() => updateNode(i, { fill: undefined })}
                      />
                      <ColorField
                        label="Borda"
                        value={n.stroke || '#4a4a4a'}
                        onChange={(v) => updateNode(i, { stroke: v })}
                        onClear={() => updateNode(i, { stroke: undefined })}
                      />
                      <ColorField
                        label="Texto"
                        value={n.textColor || '#e0e0e0'}
                        onChange={(v) => updateNode(i, { textColor: v })}
                        onClear={() => updateNode(i, { textColor: undefined })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Agrupamentos (subgraph) ({groups.length})</EditorLabel>
          <button
            onClick={addGroup}
            className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors"
          >
            + Grupo
          </button>
        </div>

        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="bg-[#1e1e1e] rounded border border-[#333] p-2 space-y-2">
              <div className="flex gap-1.5 min-w-0">
                <input
                  value={group.id}
                  onChange={(e) => updateGroup(group.id, { id: e.target.value.replace(/\s+/g, '_').toUpperCase() || group.id })}
                  className="w-[120px] bg-[#2a2a2a] text-[#ccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
                />
                <input
                  value={group.label}
                  onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                  className="flex-1 min-w-0 bg-[#2a2a2a] text-[#ccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
                  placeholder="Titulo do grupo"
                />
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-[#555] hover:text-[#ff6b6b] transition-colors px-1.5"
                >×</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#777]">Pai:</span>
                <select
                  value={group.parentId || ''}
                  onChange={(e) => updateGroup(group.id, { parentId: e.target.value || undefined })}
                  className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
                >
                  <option value="">(raiz)</option>
                  {groups
                    .filter((g) => g.id !== group.id)
                    .map((g) => <option key={g.id} value={g.id}>{g.id}</option>)}
                </select>
              </div>

              <div>
                <p className="text-[10px] text-[#777] mb-1">Nos deste grupo</p>
                <div className="flex flex-wrap gap-1">
                  {nodes.length === 0 && <span className="text-[10px] text-[#666]">Adicione nos primeiro</span>}
                  {nodes.map((node) => {
                    const selected = group.nodeIds.includes(node.id)
                    return (
                      <button
                        key={node.id}
                        onClick={() => toggleNodeInGroup(group.id, node.id)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${selected
                          ? 'bg-[#1e3a8a33] text-[#9ec7ff] border-[#4a9eff]'
                          : 'bg-[#2a2a2a] text-[#888] border-[#3a3a3a] hover:border-[#555]'
                        }`}
                      >
                        {selected ? '✓ ' : ''}{node.id}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#666] uppercase tracking-wide mb-1">Cor do agrupamento</p>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={`${group.id}-${preset.name}`}
                      onClick={() => applyGroupColorPreset(group.id, preset)}
                      className="px-2 py-1 rounded text-[10px] border transition-all hover:scale-105"
                      style={{
                        background: preset.fill || '#2a2a2a',
                        borderColor: preset.stroke || '#3a3a3a',
                        color: preset.textColor || '#aaa',
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <ColorField
                    label="Fundo"
                    value={group.fill || '#2d2d2d'}
                    onChange={(v) => updateGroup(group.id, { fill: v })}
                    onClear={() => updateGroup(group.id, { fill: undefined })}
                  />
                  <ColorField
                    label="Borda"
                    value={group.stroke || '#4a4a4a'}
                    onChange={(v) => updateGroup(group.id, { stroke: v })}
                    onClear={() => updateGroup(group.id, { stroke: undefined })}
                  />
                  <ColorField
                    label="Texto"
                    value={group.textColor || '#e0e0e0'}
                    onChange={(v) => updateGroup(group.id, { textColor: v })}
                    onClear={() => updateGroup(group.id, { textColor: undefined })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <EditorLabel>Conexoes ({edges.length})</EditorLabel>
        </div>
        <div className="space-y-2 mb-2">
          {edges.map((e, i) => (
            <div key={i} className="bg-[#1e1e1e] px-2 py-2 rounded border border-[#333] space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">De</span>
                <NodeSelect value={e.from} onChange={(v) => updateEdge(i, { from: v })} nodes={nodes} placeholder="Origem" />
                <button
                  onClick={() => setEdges((es) => es.filter((_, idx) => idx !== i))}
                  className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0 px-1.5"
                >×</button>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Tipo</span>
                <select
                  value={e.style}
                  onChange={(ev) => updateEdge(i, { style: ev.target.value as FlowEdge['style'] })}
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
                <NodeSelect value={e.to} onChange={(v) => updateEdge(i, { to: v })} nodes={nodes} placeholder="Destino" />
              </div>
              <textarea
                value={e.label}
                onChange={(ev) => updateEdge(i, { label: ev.target.value })}
                placeholder="Texto da conexao"
                rows={Math.max(2, e.label.split('\n').length)}
                className="w-full min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff] resize-y font-sans leading-snug"
              />
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] p-2.5 rounded border border-[#333] space-y-1.5 min-w-0">
          <EditorLabel>Nova Conexao</EditorLabel>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">De</span>
            <NodeSelect value={newEdge.from} onChange={(v) => setNewEdge((s) => ({ ...s, from: v }))} nodes={nodes} placeholder="Origem" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#666] uppercase shrink-0 w-5">Tipo</span>
            <select
              value={newEdge.style}
              onChange={(e) => setNewEdge((s) => ({ ...s, style: e.target.value as FlowEdge['style'] }))}
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
            <NodeSelect value={newEdge.to} onChange={(v) => setNewEdge((s) => ({ ...s, to: v }))} nodes={nodes} placeholder="Destino" />
          </div>
          <div className="flex gap-1.5 min-w-0">
            <input
              value={newEdge.label}
              onChange={(e) => setNewEdge((s) => ({ ...s, label: e.target.value }))}
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
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded border border-[#3a3a3a] bg-transparent cursor-pointer shrink-0"
          style={{ padding: 0 }}
        />
        <button
          onClick={onClear}
          className="text-[9px] text-[#666] hover:text-[#aaa] transition-colors"
          title="Resetar"
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
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none"
    >
      <option value="">{placeholder}</option>
      {nodes.map((n) => {
        const preview = n.label.replace(/\n/g, ' ').slice(0, 30)
        return <option key={n.id} value={n.id}>{n.id}: {preview}</option>
      })}
    </select>
  )
}

function EditorLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}

