import React, { useState, useRef, useEffect } from 'react'
import { FileNode } from '../../../shared/types'
import { Icons } from './SidebarIcons'

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  onOpen: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  onMoveFile: (srcPath: string, destDir: string) => void
  renamingPath: string | null
  onRenameCommit: (node: FileNode, newName: string) => void
  onRenameCancel: () => void
  dirtyPaths?: Set<string>
}

export function FileTreeNode({
  node, depth, onOpen, onContextMenu, onMoveFile,
  renamingPath, onRenameCommit, onRenameCancel, dirtyPaths
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRenaming = renamingPath === node.path

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      const dot = node.name.lastIndexOf('.')
      inputRef.current.setSelectionRange(0, dot > 0 ? dot : node.name.length)
    }
  }, [isRenaming, node.name])

  // ─── Drag handlers (arquivos são arrastados, pastas são destino) ──────────

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type !== 'file') return
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    
    // Adiciona uma imagem de arrasto personalizada para melhor feedback
    const dragIcon = document.createElement('div')
    dragIcon.className = 'drag-icon'
    dragIcon.textContent = node.name
    dragIcon.style.position = 'absolute'
    dragIcon.style.top = '-1000px'
    document.body.appendChild(dragIcon)
    e.dataTransfer.setDragImage(dragIcon, 0, 0)
    
    // Remove o elemento após o início do arrasto
    setTimeout(() => {
      document.body.removeChild(dragIcon)
    }, 0)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type !== 'folder') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Ignora eventos de filhos (bubbling)
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (node.type !== 'folder') return
    const srcPath = e.dataTransfer.getData('text/plain')
    if (!srcPath || srcPath === node.path) return
    onMoveFile(srcPath, node.path)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        draggable={node.type === 'file'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-1.5 py-[5px] cursor-pointer text-[#cccccc] hover:bg-[#2a2d2e] text-[13px] transition-colors ${isDragOver ? 'drop-target-active' : ''} ${isDragging ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
        onClick={() => {
          if (isRenaming) return
          if (node.type === 'folder') setExpanded(e => !e)
          else onOpen(node.path)
        }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, node) }}
      >
        {node.type === 'folder' && (
          <span className="text-[#c5c5c5] flex-shrink-0">
            {expanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
          </span>
        )}
        {node.type === 'file' && <span className="w-3 flex-shrink-0" />}
        <span className={`flex-shrink-0 ${node.type === 'folder' ? 'text-[#dcb67a]' : 'text-[#519aba]'}`}>
          {node.type === 'folder' ? <Icons.Folder expanded={expanded} /> : <Icons.FileMarkdown />}
        </span>

        {isRenaming ? (
          <input
            ref={inputRef}
            defaultValue={node.name}
            className="flex-1 min-w-0 bg-[#3c3c3c] text-[#cccccc] text-[13px] px-1 rounded outline outline-1 outline-[#4a9eff]"
            onClick={e => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter')  onRenameCommit(node, e.currentTarget.value.trim())
              if (e.key === 'Escape') onRenameCancel()
            }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim()
              if (v && v !== node.name) onRenameCommit(node, v)
              else onRenameCancel()
            }}
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}
        {node.type === 'file' && dirtyPaths?.has(node.path) && !isRenaming && (
          <span className="text-[#4a9eff] text-[10px] flex-shrink-0 ml-1" title="Não salvo">●</span>
        )}
      </div>

      {node.type === 'folder' && expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
          onMoveFile={onMoveFile}
          renamingPath={renamingPath}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
          dirtyPaths={dirtyPaths}
        />
      ))}
    </div>
  )
}
