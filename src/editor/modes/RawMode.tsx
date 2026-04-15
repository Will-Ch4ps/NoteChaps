import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { shallow } from 'zustand/shallow'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'

interface RawModeProps {
  tabId: string
  initialContent: string
}

export function RawMode({ tabId, initialContent }: RawModeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rawFontSize = useUIStore((state) => state.rawFontSize)
  const { updateRawContent, markDirty } = useTabsStore(
    (state) => ({
      updateRawContent: state.updateRawContent,
      markDirty: state.markDirty
    }),
    shallow
  )
  const content = useTabsStore((state) => state.tabs.find((tab) => tab.id === tabId)?.rawContent)

  const resolvedContent = useMemo(() => content ?? initialContent, [content, initialContent])

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0'
    textarea.style.height = `${Math.max(textarea.scrollHeight, 800)}px`
  }, [])

  useEffect(() => {
    autoResize()
    const textarea = textareaRef.current
    if (!textarea) return
    try {
      textarea.focus({ preventScroll: true })
    } catch {
      textarea.focus()
    }
  }, [tabId, autoResize])

  useEffect(() => {
    autoResize()
  }, [resolvedContent, rawFontSize, autoResize])

  return (
    <textarea
      ref={textareaRef}
      value={resolvedContent}
      className="w-full resize-none outline-none bg-transparent font-mono text-[#1a1a1a] p-0 leading-relaxed"
      style={{
        fontSize: `${rawFontSize}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowX: 'hidden',
        overflowY: 'hidden',
        minHeight: '800px',
        display: 'block'
      }}
      spellCheck={false}
      onChange={(event) => {
        updateRawContent(tabId, event.target.value)
        markDirty(tabId, true)
        autoResize()
      }}
    />
  )
}
