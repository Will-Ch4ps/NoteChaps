import React, { useEffect, useMemo, useState } from 'react'
import { GanttTask, parseGantt, buildGantt } from './diagramEditorHelpers'

const DURATIONS = ['1d','3d','5d','7d','10d','14d','21d','30d','1w','2w','3w','4w']

interface Props { code: string; onChange: (c: string) => void }

export function GanttEditor({ code, onChange }: Props) {
  const parsed              = useMemo(() => parseGantt(code), [code])
  const [title, setTitle]   = useState(parsed.title)
  const [tasks, setTasks]   = useState<GanttTask[]>(parsed.tasks)

  const sections = useMemo(() => [...new Set(tasks.map(t => t.section))], [tasks])

  useEffect(() => { onChange(buildGantt(title, tasks)) }, [title, tasks])

  const addSection = () => {
    const today = new Date().toISOString().split('T')[0]
    const name  = `Seção ${sections.length + 1}`
    setTasks(ts => [...ts, { section: name, name: 'Primeira tarefa', id: '', start: today, duration: '7d' }])
  }

  const addTask = (section: string) => {
    const today = new Date().toISOString().split('T')[0]
    setTasks(ts => [...ts, { section, name: 'Nova tarefa', id: '', start: today, duration: '7d' }])
  }

  const updateTask = (i: number, patch: Partial<GanttTask>) =>
    setTasks(ts => ts.map((t, idx) => idx === i ? { ...t, ...patch } : t))

  const removeTask = (i: number) => setTasks(ts => ts.filter((_, idx) => idx !== i))

  return (
    <div className="p-3 space-y-4">
      {/* Title */}
      <div>
        <Label>Título do Projeto</Label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full mt-1.5 bg-[#1a1a1a] text-[#cccccc] text-[13px] px-2 py-1.5 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
        />
      </div>

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Label>{sec}</Label>
            </div>
            <button onClick={() => addTask(sec)} className="text-[11px] text-[#4a9eff] hover:text-[#3a8eef] transition-colors">
              + Tarefa
            </button>
          </div>
          <div className="space-y-2">
            {tasks
              .map((t, ri) => ({ t, ri }))
              .filter(({ t }) => t.section === sec)
              .map(({ t, ri }) => (
                <div key={ri} className="bg-[#1e1e1e] p-2.5 rounded border border-[#333] space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={t.name}
                      onChange={e => updateTask(ri, { name: e.target.value })}
                      className="flex-1 bg-[#2a2a2a] text-[#cccccc] text-[12px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff]"
                    />
                    <button onClick={() => removeTask(ri)} className="text-[#555] hover:text-[#ff6b6b] transition-colors">×</button>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#555] mb-0.5">Início (YYYY-MM-DD)</div>
                      <input
                        value={t.start}
                        onChange={e => updateTask(ri, { start: e.target.value })}
                        placeholder="2024-01-01"
                        className="w-full bg-[#2a2a2a] text-[#aaa] text-[11px] px-2 py-1 rounded border border-[#3a3a3a] outline-none focus:border-[#4a9eff] font-mono"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#555] mb-0.5">Duração</div>
                      <select
                        value={t.duration}
                        onChange={e => updateTask(ri, { duration: e.target.value })}
                        className="bg-[#2a2a2a] text-[#aaa] text-[11px] px-1.5 py-1 rounded border border-[#3a3a3a] outline-none"
                      >
                        {DURATIONS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full py-2 rounded border border-dashed border-[#3a3a3a] text-[#555] text-[12px] hover:border-[#4a9eff] hover:text-[#4a9eff] transition-colors"
      >
        + Nova Seção
      </button>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#858585] uppercase tracking-wide font-semibold">{children}</p>
}
