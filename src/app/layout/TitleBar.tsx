import React from 'react'
import { useTabsStore } from '../../store/tabsStore'

export function TitleBar() {
  const { getActiveTab } = useTabsStore()
  const tab = getActiveTab()
  const title = tab ? tab.title : 'NoteChaps'

  return (
    <div
      className="flex items-center justify-center h-10 bg-[#2d2d2d] border-b border-[#333] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-[#aaa] text-sm font-medium">{title}</span>
    </div>
  )
}
