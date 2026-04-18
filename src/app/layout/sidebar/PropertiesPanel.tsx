import React, { useCallback, useMemo, useState } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { useTabsStore } from '../../../store/tabsStore'
import { formatDate } from '../../../shared/utils'
import { parseFrontmatter, serializeFrontmatter } from '../../../shared/utils/frontmatter'
import { HeadingEntry } from '../../../shared/types'
import { TextSelection } from 'prosemirror-state'
import { Node as PMNode } from 'prosemirror-model'

const RAW_JUMP_EVENT = 'notechaps:raw-jump-to-offset'

function collectRawHeadings(rawContent: string): Array<{ level: number; text: string; from: number; to: number }> {
  const headings: Array<{ level: number; text: string; from: number; to: number }> = []
  const lines = rawContent.split('\n')
  let offset = 0

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        from: offset,
        to: offset + line.length
      })
    }
    offset += line.length + 1
  }

  return headings
}

function collectViewHeadings(doc: PMNode): HeadingEntry[] {
  const headings: HeadingEntry[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    headings.push({
      level: Number(node.attrs.level ?? 1),
      text: node.textContent,
      pos
    })
    return true
  })
  return headings
}

export function PropertiesPanel() {
  const { docProperties, activeView, selectionProperties } = useEditorStore()
  const { getActiveTab, updateRawContent, markDirty } = useTabsStore()
  const tab = getActiveTab()
  const [newTag, setNewTag]     = useState('')
  const [addingTag, setAdding]  = useState(false)

  const { meta: frontmatter } = useMemo(() => {
    if (!tab?.rawContent) return { meta: {}, body: '' }
    return parseFrontmatter(tab.rawContent)
  }, [tab?.rawContent])

  const tags: string[] = useMemo(() => {
    const t = frontmatter.tags
    if (Array.isArray(t)) return t.map(String)
    if (typeof t === 'string' && t) return [t]
    return []
  }, [frontmatter.tags])

  const saveFrontmatter = useCallback((newMeta: Record<string, unknown>) => {
    if (!tab) return
    const { body } = parseFrontmatter(tab.rawContent)
    const newContent = serializeFrontmatter(newMeta as Record<string, string | string[]>, body)
    updateRawContent(tab.id, newContent)
    markDirty(tab.id, true)
  }, [tab, updateRawContent, markDirty])

  const addTag = useCallback((tag: string) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tags.includes(t)) return
    saveFrontmatter({ ...frontmatter, tags: [...tags, t] })
    setNewTag(''); setAdding(false)
  }, [tags, frontmatter, saveFrontmatter])

  const removeTag = useCallback((tag: string) =>
    saveFrontmatter({ ...frontmatter, tags: tags.filter(t => t !== tag) })
  , [tags, frontmatter, saveFrontmatter])

  const goToHeading = useCallback((heading: HeadingEntry, headingIndex: number) => {
    if (!tab) return

    if (tab.mode === 'raw') {
      const rawHeadings = collectRawHeadings(tab.rawContent)
      const fallback = rawHeadings.find((item) => item.level === heading.level && item.text === heading.text)
      const target = rawHeadings[headingIndex] ?? fallback
      if (!target) return

      window.dispatchEvent(
        new CustomEvent(RAW_JUMP_EVENT, {
          detail: { tabId: tab.id, from: target.from, to: target.to }
        })
      )
      return
    }

    if (!activeView) return
    try {
      const liveHeadings = collectViewHeadings(activeView.state.doc)
      const fallback = liveHeadings.find((item) => item.level === heading.level && item.text === heading.text)
      const targetHeading = liveHeadings[headingIndex] ?? fallback
      if (!targetHeading) return

      const maxPos = activeView.state.doc.content.size
      const targetPos = Math.max(1, Math.min(targetHeading.pos + 1, maxPos))
      const tr = activeView.state.tr.setSelection(TextSelection.near(activeView.state.doc.resolve(targetPos), 1))
      activeView.dispatch(tr)
      activeView.focus()

      requestAnimationFrame(() => {
        const scrollRoot = document.querySelector<HTMLElement>('[data-editor-scroll-root="true"]')
        if (!scrollRoot) return

        const dom = activeView.domAtPos(targetPos)
        const baseEl =
          dom.node.nodeType === 1
            ? (dom.node as HTMLElement)
            : (dom.node.parentElement as HTMLElement | null)
        const targetEl = baseEl?.closest('h1,h2,h3,h4,h5,h6') ?? baseEl
        if (targetEl) {
          const targetRect = targetEl.getBoundingClientRect()
          const rootRect = scrollRoot.getBoundingClientRect()
          const nextTop = scrollRoot.scrollTop + (targetRect.top - rootRect.top) - scrollRoot.clientHeight * 0.2
          scrollRoot.scrollTop = Math.max(0, nextTop)
          return
        }

        const coords = activeView.coordsAtPos(targetPos)
        const rootRect = scrollRoot.getBoundingClientRect()
        const nextTop = scrollRoot.scrollTop + (coords.top - rootRect.top) - scrollRoot.clientHeight * 0.2
        scrollRoot.scrollTop = Math.max(0, nextTop)
      })
    } catch { /* ignore */ }
  }, [activeView, tab])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {tab && docProperties ? (
          <>
            <Section title="Documento">
              <Row label="Arquivo"    value={tab.title} />
              <Row label="Formato"    value={tab.ext === 'md' ? 'Markdown' : tab.ext.toUpperCase()} />
              <Row label="Palavras"   value={String(docProperties.wordCount)} />
              <Row label="Caracteres" value={String(docProperties.charCount)} />
              {docProperties.mtime && <Row label="Modificado" value={formatDate(docProperties.mtime)} />}
            </Section>

            {selectionProperties && (
              <Section title="Seleção">
                <Row label="Palavras" value={String(selectionProperties.wordCount)} />
                <Row label="Tipo"     value={selectionProperties.nodeType} />
              </Section>
            )}

            {docProperties.headings.length > 0 && (
              <Section title="Estrutura">
                {docProperties.headings.map((h, i) => (
                  <button
                    key={`${h.pos}-${i}`}
                    onClick={() => goToHeading(h, i)}
                    title={h.text}
                    className="w-full text-left text-[13px] text-[#cccccc] py-1 px-2 truncate cursor-pointer hover:bg-[#2a2d2e] rounded transition-colors flex items-center gap-2"
                    style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                  >
                    <span className="text-[#858585] text-[10px] font-mono shrink-0">H{h.level}</span>
                    <span className="truncate">{h.text}</span>
                  </button>
                ))}
              </Section>
            )}

            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-[#094771] text-[#4a9eff] text-[11px] px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100 ml-0.5 leading-none">×</button>
                  </span>
                ))}
                {tags.length === 0 && !addingTag && (
                  <span className="text-[#555] text-[12px]">Sem tags</span>
                )}
              </div>
              {addingTag ? (
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTag(newTag)
                    if (e.key === 'Escape') { setAdding(false); setNewTag('') }
                  }}
                  onBlur={() => { if (newTag.trim()) addTag(newTag); else setAdding(false) }}
                  placeholder="nova-tag"
                  className="w-full bg-[#3c3c3c] text-[#cccccc] text-[12px] px-2 py-1 rounded outline outline-1 outline-[#4a9eff]"
                />
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-1 text-[#555] hover:text-[#4a9eff] text-[12px] transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>Adicionar tag</span>
                </button>
              )}
            </Section>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#858585] text-xs">Abra um arquivo para ver as propriedades</p>
          </div>
        )}
      </div>

      {docProperties && (
        <div className="px-3 py-2 border-t border-[#3e3e42] text-[11px] text-[#858585] flex items-center justify-between shrink-0">
          <span>{docProperties.wordCount} palavras</span>
          {selectionProperties && <span className="text-[#4a9eff]">{selectionProperties.wordCount} sel.</span>}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#858585] text-[11px] uppercase tracking-wide mb-2 font-semibold">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[13px] py-0.5">
      <span className="text-[#858585]">{label}</span>
      <span className="text-[#cccccc] truncate ml-2 max-w-[180px]" title={value}>{value}</span>
    </div>
  )
}
