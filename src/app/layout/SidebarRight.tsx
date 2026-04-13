import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PropertiesPanel } from './sidebar/PropertiesPanel'
import { DiagramPanel } from './sidebar/diagram/DiagramPanel'
import { TablePanel } from './sidebar/table/TablePanel'
import { ClaudePanel } from './sidebar/ClaudePanel'

type ActiveTab = 'properties' | 'diagram' | 'table' | 'claude'

const MIN_WIDTH = 260
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 320

export function SidebarRight() {
  const { activeDiagram, activeTable } = useEditorStore()
  const [tab, setTab]     = useState<ActiveTab>('properties')
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging          = useRef(false)
  const startX            = useRef(0)
  const startW            = useRef(0)

  useEffect(() => { if (activeDiagram) setTab('diagram') }, [activeDiagram])
  useEffect(() => { if (activeTable)   setTab('table')   }, [activeTable])

  // When active items close, fall back to properties
  useEffect(() => { if (!activeDiagram && tab === 'diagram') setTab('properties') }, [activeDiagram])
  useEffect(() => { if (!activeTable   && tab === 'table')   setTab('properties') }, [activeTable])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = width
  }, [width])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta)))
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  return (
    <div
      className="sidebar-right-enter flex flex-col bg-[#252526] border-l border-[#3e3e42] select-none shrink-0 relative"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[#4a9eff] transition-colors"
        style={{ marginLeft: -2 }}
      />

      {/* Tab bar — only show active-context tabs */}
      <div className="flex border-b border-[#3e3e42] bg-[#2d2d30] shrink-0 overflow-x-auto scrollbar-hide">
        <TabBtn active={tab === 'properties'} onClick={() => setTab('properties')}>
          Propriedades
        </TabBtn>
        {activeTable && (
          <TabBtn active={tab === 'table'} onClick={() => setTab('table')}>
            ● Tabela
          </TabBtn>
        )}
        {activeDiagram && (
          <TabBtn active={tab === 'diagram'} onClick={() => setTab('diagram')}>
            ● Diagrama
          </TabBtn>
        )}
        <TabBtn active={tab === 'claude'} onClick={() => setTab('claude')}>
          Claude
        </TabBtn>
      </div>

      {tab === 'properties' && <PropertiesPanel />}
      {tab === 'table'      && <TablePanel />}
      {tab === 'diagram'    && <DiagramPanel />}
      {tab === 'claude'     && <ClaudePanel />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors whitespace-nowrap ${
        active
          ? 'text-[#4a9eff] border-b-2 border-[#4a9eff] -mb-px bg-[#252526]'
          : 'text-[#858585] hover:text-[#cccccc]'
      }`}
    >
      {children}
    </button>
  )
}
