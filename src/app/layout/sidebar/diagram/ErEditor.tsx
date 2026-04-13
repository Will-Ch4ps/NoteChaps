import React, { useEffect, useMemo, useState } from 'react'
import { ErEntity, ErField, ErRel, parseEr, buildEr } from './diagramEditorHelpers'

const FIELD_TYPES = ['int', 'string', 'decimal', 'boolean', 'datetime', 'text', 'uuid', 'float']
const REL_TYPES   = ['||--||', '||--o{', '||--|{', 'o{--o{']

interface Props { code: string; onChange: (c: string) => void }

export function ErEditor({ code, onChange }: Props) {
  const parsed                  = useMemo(() => parseEr(code), [code])
  const [entities, setEntities] = useState<ErEntity[]>(parsed.entities)
  const [rels, setRels]         = useState<ErRel[]>(parsed.rels)

  useEffect(() => { onChange(buildEr(entities, rels)) }, [entities, rels])

  const addEntity = () =>
    setEntities(es => [...es, { name: `ENTIDADE${es.length + 1}`, fields: [{ type: 'int', name: 'id', key: 'PK' }] }])

  const updateName = (i: number, name: string) =>
    setEntities(es => es.map((e, idx) => idx === i ? { ...e, name: name.toUpperCase().replace(/\s+/g, '_') } : e))

  const addField = (ei: number) =>
    setEntities(es => es.map((e, idx) => idx !== ei ? e : { ...e, fields: [...e.fields, { type: 'string', name: 'campo', key: '' as ErField['key'] }] }))

  const updateField = (ei: number, fi: number, patch: Partial<ErField>) =>
    setEntities(es => es.map((e, idx) => idx !== ei ? e : {
      ...e, fields: e.fields.map((f, fidx) => fidx === fi ? { ...f, ...patch } : f)
    }))

  const removeField = (ei: number, fi: number) =>
    setEntities(es => es.map((e, idx) => idx !== ei ? e : { ...e, fields: e.fields.filter((_, fidx) => fidx !== fi) }))

  const removeEntity = (i: number) => {
    const name = entities[i].name
    setEntities(es => es.filter((_, idx) => idx !== i))
    setRels(rs => rs.filter(r => r.from !== name && r.to !== name))
  }

  const updateRel = (i: number, patch: Partial<ErRel>) =>
    setRels(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  return (
    <div className="p-3 space-y-4">
      {/* Entities */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Entidades</Label>
          <button onClick={addEntity} className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors">+ Entidade</button>
        </div>
        <div className="space-y-2">
          {entities.map((e, ei) => (
            <div key={ei} className="bg-[#1e1e1e] rounded border border-[#333] overflow-hidden">
              {/* Entity header */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#252526] border-b border-[#333]">
                <input
                  value={e.name}
                  onChange={ev => updateName(ei, ev.target.value)}
                  className="flex-1 bg-transparent text-[#cccccc] text-[12px] font-semibold font-mono outline-none"
                />
                <button onClick={() => addField(ei)} className="text-[10px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors">+ Campo</button>
                <button onClick={() => removeEntity(ei)} className="text-[#555] hover:text-[#ff6b6b] text-sm transition-colors">×</button>
              </div>
              {/* Fields */}
              <div className="p-1.5 space-y-1">
                {e.fields.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-1 text-[11px]">
                    <select value={f.type} onChange={ev => updateField(ei, fi, { type: ev.target.value })}
                      className="bg-[#2a2a2a] text-[#aaa] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none">
                      {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input value={f.name} onChange={ev => updateField(ei, fi, { name: ev.target.value })}
                      className="flex-1 min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-1.5 py-0.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]" />
                    <select value={f.key} onChange={ev => updateField(ei, fi, { key: ev.target.value as ErField['key'] })}
                      className="bg-[#2a2a2a] text-[#aaa] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none">
                      <option value="">-</option>
                      <option value="PK">PK</option>
                      <option value="FK">FK</option>
                    </select>
                    <button onClick={() => removeField(ei, fi)} className="text-[#555] hover:text-[#ff6b6b] transition-colors">×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Relationships */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Relacionamentos</Label>
          <button
            onClick={() => entities.length >= 2 && setRels(rs => [...rs, { from: entities[0].name, rel: '||--o{', to: entities[1].name, label: 'tem' }])}
            disabled={entities.length < 2}
            className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] disabled:opacity-40 transition-colors"
          >
            + Relação
          </button>
        </div>
        <div className="space-y-1.5">
          {rels.map((r, ri) => (
            <div key={ri} className="flex items-center gap-1 bg-[#1e1e1e] px-2 py-1.5 rounded border border-[#333]">
              <select value={r.from} onChange={e => updateRel(ri, { from: e.target.value })}
                className="flex-1 bg-[#2a2a2a] text-[#aaa] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none">
                {entities.map(e => <option key={e.name}>{e.name}</option>)}
              </select>
              <select value={r.rel} onChange={e => updateRel(ri, { rel: e.target.value })}
                className="bg-[#2a2a2a] text-[#aaa] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none font-mono">
                {REL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={r.to} onChange={e => updateRel(ri, { to: e.target.value })}
                className="flex-1 bg-[#2a2a2a] text-[#aaa] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none">
                {entities.map(e => <option key={e.name}>{e.name}</option>)}
              </select>
              <input value={r.label} onChange={e => updateRel(ri, { label: e.target.value })}
                placeholder="label"
                className="w-14 bg-[#2a2a2a] text-[#cccccc] text-[10px] px-1 py-0.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]" />
              <button onClick={() => setRels(rs => rs.filter((_, i) => i !== ri))}
                className="text-[#555] hover:text-[#ff6b6b] transition-colors">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}
