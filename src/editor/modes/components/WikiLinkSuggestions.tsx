import React, { useEffect, useState, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { useFilesStore } from '../../../store/filesStore'
import { FileNode } from '../../../shared/types'
import { schema } from '../../core/schema'

interface Props {
  view: EditorView
  from: number
  to: number
  query: string
  onClose: () => void
}

function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') result.push(node)
    if (node.children) result.push(...flattenTree(node.children))
  }
  return result
}

export function WikiLinkSuggestions({ view, from, to, query, onClose }: Props) {
  const { tree } = useFilesStore()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const files = flattenTree(tree)
  const filtered = files
    .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)

  const coords = view.coordsAtPos(from)
  const top = coords.bottom
  const left = coords.left

  const insertLink = (file: FileNode) => {
    const target = file.name.replace(/\.md$/, '')
    const textContent = schema.text(`[[${target}]]`)
    const wikiNode = schema.nodes.wiki_link.create({ target, label: target }, textContent)
    
    // Substitui a tag no editor e adiciona um "espaço" após o Node para evitar que o cursor "grude" nele.
    const tr = view.state.tr.replaceWith(from, to, wikiNode)
    const newPos = tr.mapping.map(to)
    tr.insertText(' ', newPos)
    
    view.dispatch(tr)
    view.focus()
    onClose()
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        // O preventDefault aqui é crítico! Evita que a tecla de Confirmação no menu suspenso 
        // também force o Editor principal a quebrar uma linha (adicionando aquela linha extra indesejada).
        e.preventDefault()
        e.stopPropagation()
        insertLink(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [filtered, selectedIndex, from, to, view, onClose])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (filtered.length === 0) return null

  return (
    <div
      style={{ position: 'fixed', top, left, zIndex: 100000 }}
      className="w-64 bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-fade-in-scale"
    >
      <div className="text-[10px] text-[#888] px-3 py-1.5 bg-[#252525] border-b border-[#3a3a3a] uppercase font-semibold">
        Sugerir Arquivo
      </div>
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
        {filtered.map((file, i) => (
          <div
            key={file.path}
            className={`px-3 py-1.5 text-sm cursor-pointer truncate flex items-center transition-colors ${
              i === selectedIndex ? 'bg-[#094771] text-white' : 'text-[#ccc] hover:bg-[#3a3a3a]'
            }`}
            onClick={(e) => { e.preventDefault(); insertLink(file); }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="opacity-50 mr-2 text-xs">📄</span>
            {file.name.replace(/\.md$/, '')}
          </div>
        ))}
      </div>
    </div>
  )
}