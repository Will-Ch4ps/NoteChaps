import React, { useEffect, useMemo, useState } from 'react'
import { SeqParticipant, SeqMessage, parseSequence, buildSequence } from './diagramEditorHelpers'

interface Props { code: string; onChange: (c: string) => void }

export function SequenceEditor({ code, onChange }: Props) {
  const parsed                      = useMemo(() => parseSequence(code), [code])
  const [participants, setP]        = useState<SeqParticipant[]>(parsed.participants)
  const [messages, setM]            = useState<SeqMessage[]>(parsed.messages)
  const [newMsg, setNewMsg]         = useState<SeqMessage>({ from: '', to: '', text: '', style: '->>' })

  useEffect(() => { onChange(buildSequence(participants, messages)) }, [participants, messages])

  const updateP = (i: number, patch: Partial<SeqParticipant>) =>
    setP(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p))

  const removeP = (i: number) => {
    const id = participants[i].id
    setP(ps => ps.filter((_, idx) => idx !== i))
    setM(ms => ms.filter(m => m.from !== id && m.to !== id))
  }

  const updateMsg = (i: number, patch: Partial<SeqMessage>) =>
    setM(ms => ms.map((m, idx) => idx === i ? { ...m, ...patch } : m))

  const addMsg = () => {
    if (!newMsg.from || !newMsg.to || !newMsg.text) return
    setM(ms => [...ms, { ...newMsg }])
    setNewMsg({ from: '', to: '', text: '', style: '->>' })
  }

  return (
    <div className="p-3 space-y-4">
      {/* Participants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Participantes</Label>
          <button
            onClick={() => setP(ps => [...ps, { id: `P${ps.length + 1}`, alias: `Participante ${ps.length + 1}` }])}
            className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-1.5">
          {participants.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5 bg-[#1e1e1e] px-2 py-1.5 rounded border border-[#333]">
              <span className="text-[10px] text-[#555] font-mono w-5 shrink-0">{p.id}</span>
              <input
                value={p.alias}
                onChange={e => updateP(i, { alias: e.target.value })}
                placeholder="Nome exibido"
                className="flex-1 min-w-0 bg-[#2a2a2a] text-[#cccccc] text-[12px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
              />
              <button onClick={() => removeP(i)} className="text-[#555] hover:text-[#ff6b6b] transition-colors shrink-0">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div>
        <Label>Mensagens ({messages.length})</Label>
        <div className="space-y-1.5 mt-2 mb-2">
          {messages.map((m, i) => (
            <div key={i} className="bg-[#1e1e1e] px-2 py-2 rounded border border-[#333] space-y-1.5">
              <div className="grid gap-1" style={{ gridTemplateColumns: '1fr auto 1fr auto' }}>
                <PSelect value={m.from} onChange={v => updateMsg(i, { from: v })} participants={participants} placeholder="De" />
                <select
                  value={m.style}
                  onChange={e => updateMsg(i, { style: e.target.value as SeqMessage['style'] })}
                  className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1 py-1 rounded border border-[#3a3a3a] outline-none"
                >
                  <option value="->>">→</option>
                  <option value="-->>">⤳</option>
                </select>
                <PSelect value={m.to} onChange={v => updateMsg(i, { to: v })} participants={participants} placeholder="Para" />
                <button
                  onClick={() => setM(ms => ms.filter((_, idx) => idx !== i))}
                  className="text-[#555] hover:text-[#ff6b6b] transition-colors px-1"
                >×</button>
              </div>
              <input
                value={m.text}
                onChange={e => updateMsg(i, { text: e.target.value })}
                placeholder="Descrição da mensagem"
                className="w-full bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
              />
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] p-2.5 rounded border border-[#333] space-y-2">
          <Label>Nova Mensagem</Label>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <PSelect value={newMsg.from} onChange={v => setNewMsg(s => ({ ...s, from: v }))} participants={participants} placeholder="De" />
            <select
              value={newMsg.style}
              onChange={e => setNewMsg(s => ({ ...s, style: e.target.value as SeqMessage['style'] }))}
              className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1 py-1 rounded border border-[#3a3a3a] outline-none"
            >
              <option value="->>">→</option>
              <option value="-->>">⤳</option>
            </select>
            <PSelect value={newMsg.to} onChange={v => setNewMsg(s => ({ ...s, to: v }))} participants={participants} placeholder="Para" />
          </div>
          <div className="flex gap-1.5">
            <input
              value={newMsg.text}
              onChange={e => setNewMsg(s => ({ ...s, text: e.target.value }))}
              placeholder="Descrição da mensagem"
              onKeyDown={e => { if (e.key === 'Enter') addMsg() }}
              className="flex-1 bg-[#2a2a2a] text-[#cccccc] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
            />
            <button
              onClick={addMsg}
              disabled={!newMsg.from || !newMsg.to || !newMsg.text}
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

function PSelect({ value, onChange, participants, placeholder }: {
  value: string; onChange: (v: string) => void; participants: SeqParticipant[]; placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
    >
      <option value="">{placeholder}</option>
      {participants.map(p => <option key={p.id} value={p.id}>{p.alias}</option>)}
    </select>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}
