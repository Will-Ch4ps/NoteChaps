import React, { useRef, useState } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { FileSystemService } from '../../filesystem/FileSystemService'
import { Tab } from '../../shared/types'
import { basename, getFileExt } from '../../shared/utils'
import { FileExt } from '../../shared/types'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabsStore()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)

  if (tabs.length === 0) return null

  return (
    <div className="flex items-end h-9 bg-[#252525] border-b border-[#333] overflow-x-auto select-none scrollbar-hide">
      {tabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isEditing={tab.id === editingTabId}
          tabCount={tabs.length}
          onActivate={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
          onRenameStart={() => setEditingTabId(tab.id)}
          onRenameCommit={async (newName) => {
            setEditingTabId(null)
            if (!newName.trim() || newName === tab.title) return
            const name = newName.trim().replace(/\.md$/, '')
            if (!tab.filePath.startsWith('untitled:')) {
              try {
                const newPath = await FileSystemService.renameFile(tab.filePath, name + '.md')
                useTabsStore.getState().updateTabInfo(tab.id, newPath, basename(newPath), getFileExt(newPath) as FileExt)
              } catch (err) { console.error('[TabRename]', err) }
            } else {
              useTabsStore.getState().updateTabInfo(tab.id, tab.filePath, name + '.md', tab.ext)
            }
          }}
          onRenameCancel={() => setEditingTabId(null)}
        />
      ))}
    </div>
  )
}

function TabItem({
  tab,
  isActive,
  isEditing,
  tabCount,
  onActivate,
  onClose,
  onRenameStart,
  onRenameCommit,
  onRenameCancel
}: {
  tab: Tab
  isActive: boolean
  isEditing: boolean
  tabCount: number
  onActivate: () => void
  onClose: () => void
  onRenameStart: () => void
  onRenameCommit: (name: string) => void
  onRenameCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) { e.preventDefault(); onClose() }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRenameStart()
    setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const noExt = el.value.replace(/\.md$/, '')
      el.setSelectionRange(0, noExt.length)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onRenameCommit(e.currentTarget.value)
    if (e.key === 'Escape') onRenameCancel()
  }

  // Largura responsiva: base 160px, cresce até 200px, encolhe até 80px quando há muitas abas
  // Com poucas abas (<= 4) as abas têm largura generosa; com muitas, encolhem igualmente
  const tabStyle: React.CSSProperties = {
    flexBasis: '160px',
    flexShrink: 1,
    flexGrow: tabCount <= 4 ? 0 : 1,
    minWidth: '80px',
    maxWidth: '200px',
  }

  // Tooltip: mostra caminho completo se não for untitled
  const tooltip = tab.filePath.startsWith('untitled:') ? tab.title : tab.filePath

  return (
    <div
      title={tooltip}
      style={tabStyle}
      className={`
        flex items-center gap-1.5 px-3 h-full border-r border-[#333] cursor-pointer
        min-w-0 group
        ${isActive
          ? 'bg-[#1a1a1a] text-[#e0e0e0] border-t border-t-[#4a9eff]'
          : 'bg-[#2d2d2d] text-[#888] hover:bg-[#333] hover:text-[#ccc]'
        }
      `}
      onClick={onActivate}
      onMouseDown={handleMiddleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          defaultValue={tab.title}
          className="bg-[#3a3a3a] text-[#e0e0e0] text-sm outline-none border border-[#4a9eff] rounded px-1 w-full min-w-0"
          onKeyDown={handleKeyDown}
          onBlur={(e) => onRenameCommit(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate text-sm flex-1 min-w-0">{tab.title}</span>
      )}
      {tab.isDirty && !isEditing && (
        <span className="text-[#4a9eff] text-xs shrink-0">●</span>
      )}
      <button
        className="shrink-0 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#555] text-[#888] hover:text-white"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        title="Fechar (Ctrl+W)"
      >
        ×
      </button>
    </div>
  )
}
