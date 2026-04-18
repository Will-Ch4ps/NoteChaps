import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { shallow } from 'zustand/shallow'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'

const RAW_JUMP_EVENT = 'notechaps:raw-jump-to-offset'
const rawScrollAnimations = new WeakMap<HTMLElement, number>()

function animateScrollTop(scrollRoot: HTMLElement, targetTop: number, duration = 220) {
  const startTop = scrollRoot.scrollTop
  const endTop = Math.max(0, targetTop)
  if (Math.abs(endTop - startTop) < 1) {
    scrollRoot.scrollTop = endTop
    return
  }

  const prevFrame = rawScrollAnimations.get(scrollRoot)
  if (prevFrame) {
    cancelAnimationFrame(prevFrame)
  }

  const startedAt = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    scrollRoot.scrollTop = startTop + (endTop - startTop) * eased
    if (progress < 1) {
      const frame = requestAnimationFrame(step)
      rawScrollAnimations.set(scrollRoot, frame)
      return
    }
    scrollRoot.scrollTop = endTop
    rawScrollAnimations.delete(scrollRoot)
  }

  const frame = requestAnimationFrame(step)
  rawScrollAnimations.set(scrollRoot, frame)
}

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

  useEffect(() => {
    const onJump = (event: Event) => {
      const custom = event as CustomEvent<{ tabId: string; from: number; to: number }>
      const payload = custom.detail
      if (!payload || payload.tabId !== tabId) return

      const textarea = textareaRef.current
      if (!textarea) return

      const from = Math.max(0, Math.min(payload.from, textarea.value.length))
      const to = Math.max(from, Math.min(payload.to, textarea.value.length))
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(from, to)

      const scrollRoot = document.querySelector<HTMLElement>('[data-editor-scroll-root="true"]')
      if (!scrollRoot) return
      const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight || '') || rawFontSize * 1.6
      const lineNumber = textarea.value.slice(0, from).split('\n').length - 1
      const targetTop = textarea.offsetTop + lineNumber * lineHeight - scrollRoot.clientHeight * 0.35
      animateScrollTop(scrollRoot, targetTop)
    }

    window.addEventListener(RAW_JUMP_EVENT, onJump as EventListener)
    return () => {
      window.removeEventListener(RAW_JUMP_EVENT, onJump as EventListener)
    }
  }, [rawFontSize, tabId])

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
