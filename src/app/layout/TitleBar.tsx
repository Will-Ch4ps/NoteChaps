import React, { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { NoteChapsMark } from '../components/NoteChapsMark'
import { useTabsStore } from '../../store/tabsStore'

function getCompactPath(filePath: string): string {
  if (!filePath || filePath.startsWith('untitled:')) return 'Sem local em disco'
  const parts = filePath.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 2) return filePath
  return `.../${parts.slice(-2).join('/')}`
}

export function TitleBar() {
  const { activeTab } = useTabsStore(
    (state) => ({
      activeTab: state.tabs.find((tab) => tab.id === state.activeTabId) ?? null
    }),
    shallow
  )

  const title = activeTab ? activeTab.title : 'NoteChaps'
  const subtitle = useMemo(() => {
    if (!activeTab) return 'Markdown editor'
    return getCompactPath(activeTab.filePath)
  }, [activeTab])

  return (
    <div
      className="flex items-center justify-center h-10 bg-[#2d2d2d] border-b border-[#333] select-none px-3"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      title={activeTab?.filePath || 'NoteChaps'}
    >
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        <NoteChapsMark size={16} />
        <span className="text-[#d9d9d9] text-sm font-medium truncate max-w-[42vw]">{title}</span>
        {activeTab?.isDirty && <span className="text-[#4a9eff] text-[10px]">●</span>}
        <span className="text-[#666] text-[11px] truncate max-w-[26vw]">{subtitle}</span>
      </div>
    </div>
  )
}
