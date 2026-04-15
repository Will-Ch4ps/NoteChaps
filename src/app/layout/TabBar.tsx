import React, { useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { FileSystemService } from '../../filesystem/FileSystemService'
import { FileExt, Tab } from '../../shared/types'
import { basename, getFileExt } from '../../shared/utils'
import { useTabsStore } from '../../store/tabsStore'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabInfo } = useTabsStore(
    (state) => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      setActiveTab: state.setActiveTab,
      closeTab: state.closeTab,
      updateTabInfo: state.updateTabInfo
    }),
    shallow
  )
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tabElementMapRef = useRef(new Map<string, HTMLDivElement>())

  const tabWidth = useMemo(() => {
    if (tabs.length <= 3) return { minWidth: 'max-content', maxWidth: '420px', showFullTitle: true }
    if (tabs.length >= 14) return { minWidth: '84px', maxWidth: '170px', showFullTitle: false }
    if (tabs.length >= 10) return { minWidth: '96px', maxWidth: '180px', showFullTitle: false }
    if (tabs.length >= 6) return { minWidth: '112px', maxWidth: '200px', showFullTitle: false }
    return { minWidth: '140px', maxWidth: '230px', showFullTitle: false }
  }, [tabs.length])

  useEffect(() => {
    if (!activeTabId) return
    const activeElement = tabElementMapRef.current.get(activeTabId)
    activeElement?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activeTabId])

  if (tabs.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="flex items-end h-9 bg-[#252525] border-b border-[#333] overflow-x-auto select-none scrollbar-hide"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
        event.preventDefault()
        const el = containerRef.current
        if (!el) return
        el.scrollLeft += event.deltaY
      }}
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isEditing={tab.id === editingTabId}
          tabCount={tabs.length}
          minWidth={tabWidth.minWidth}
          maxWidth={tabWidth.maxWidth}
          showFullTitle={tabWidth.showFullTitle}
          setElementRef={(element) => {
            if (!element) {
              tabElementMapRef.current.delete(tab.id)
              return
            }
            tabElementMapRef.current.set(tab.id, element)
          }}
          onActivate={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
          onRenameStart={() => setEditingTabId(tab.id)}
          onRenameCommit={async (newName) => {
            setEditingTabId(null)
            if (!newName.trim() || newName === tab.title) return
            const name = newName.trim().replace(/\.md$/i, '')

            if (!tab.filePath.startsWith('untitled:')) {
              try {
                const newPath = await FileSystemService.renameFile(tab.filePath, `${name}.md`)
                updateTabInfo(tab.id, newPath, basename(newPath), getFileExt(newPath) as FileExt)
              } catch (error) {
                console.error('[TabRename]', error)
              }
            } else {
              updateTabInfo(tab.id, tab.filePath, `${name}.md`, tab.ext)
            }
          }}
          onRenameCancel={() => setEditingTabId(null)}
        />
      ))}
    </div>
  )
}

const TabItem = React.memo(function TabItem({
  tab,
  isActive,
  isEditing,
  tabCount,
  minWidth,
  maxWidth,
  showFullTitle,
  setElementRef,
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
  minWidth: string
  maxWidth: string
  showFullTitle: boolean
  setElementRef: (element: HTMLDivElement | null) => void
  onActivate: () => void
  onClose: () => void
  onRenameStart: () => void
  onRenameCommit: (name: string) => void
  onRenameCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleMiddleClick = (event: React.MouseEvent) => {
    if (event.button === 1) {
      event.preventDefault()
      onClose()
    }
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onRenameStart()
    window.setTimeout(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const noExtension = input.value.replace(/\.md$/i, '')
      input.setSelectionRange(0, noExtension.length)
    }, 0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onRenameCommit(event.currentTarget.value)
    if (event.key === 'Escape') onRenameCancel()
  }

  const tabStyle: React.CSSProperties = {
    flexBasis: showFullTitle ? 'auto' : '160px',
    flexShrink: showFullTitle ? 0 : 1,
    flexGrow: showFullTitle ? 0 : tabCount > 4 ? 1 : 0,
    minWidth,
    maxWidth
  }

  const tooltip = tab.filePath.startsWith('untitled:') ? tab.title : tab.filePath
  const showCloseButton = isActive || tabCount <= 3

  return (
    <div
      ref={setElementRef}
      title={tooltip}
      style={tabStyle}
      className={`flex items-center gap-1.5 px-3 h-full border-r border-[#333] cursor-pointer min-w-0 group ${
        isActive
          ? 'bg-[#1a1a1a] text-[#e0e0e0] border-t border-t-[#4a9eff]'
          : 'bg-[#2d2d2d] text-[#888] hover:bg-[#333] hover:text-[#ccc]'
      }`}
      onClick={onActivate}
      onMouseDown={handleMiddleClick}
      onDoubleClick={handleDoubleClick}
      role="tab"
      aria-selected={isActive}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          defaultValue={tab.title}
          className="bg-[#3a3a3a] text-[#e0e0e0] text-sm outline-none border border-[#4a9eff] rounded px-1 w-full min-w-0"
          onKeyDown={handleKeyDown}
          onBlur={(event) => onRenameCommit(event.target.value)}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <span
          className={`${showFullTitle ? 'whitespace-nowrap' : 'truncate'} ${tabCount >= 12 ? 'text-[12px]' : 'text-sm'} flex-1 min-w-0`}
        >
          {tab.title}
        </span>
      )}

      {tab.isDirty && !isEditing && <span className="text-[#4a9eff] text-xs shrink-0">●</span>}

      <button
        className={`shrink-0 w-4 h-4 rounded flex items-center justify-center hover:bg-[#555] text-[#888] hover:text-white ${
          showCloseButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        title="Fechar (Ctrl+W)"
      >
        ×
      </button>
    </div>
  )
})
