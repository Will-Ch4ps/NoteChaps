import React, { useEffect, useRef, useCallback } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'

interface RawModeProps {
  tabId: string
  initialContent: string
}

export function RawMode({ tabId, initialContent }: RawModeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { updateRawContent, markDirty, tabs } = useTabsStore()
  const { rawFontSize } = useUIStore()

  const tab = tabs.find(t => t.id === tabId)
  const content = tab?.rawContent ?? initialContent

  // Auto-grow: reset to 0 first so shrinking works, then set to scrollHeight
  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = '0'
    ta.style.height = `${Math.max(ta.scrollHeight, 800)}px`
  }, [])

  useEffect(() => {
    autoResize()
    textareaRef.current?.focus()
  }, [tabId, autoResize])

  useEffect(() => {
    autoResize()
  }, [content, rawFontSize, autoResize])

  return (
    <textarea
      ref={textareaRef}
      value={content}
      className="w-full resize-none outline-none bg-transparent font-mono text-[#1a1a1a] p-0 leading-relaxed"
      style={{
        fontSize: `${rawFontSize}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowX: 'hidden',
        overflowY: 'hidden',
        minHeight: '800px',
        display: 'block',
      }}
      spellCheck={false}
      onChange={(e) => {
        updateRawContent(tabId, e.target.value)
        markDirty(tabId, true)
        autoResize()
      }}
    />
  )
}
