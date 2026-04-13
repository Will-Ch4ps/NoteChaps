import React, { useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { FileSystemService } from '../../../filesystem/FileSystemService'
import { FileNode, FileExt } from '../../../shared/types'
import { Icons } from './SidebarIcons'
import { useDialog } from '../../components/Dialog'

interface SidebarCtxMenuProps {
  x: number
  y: number
  node: FileNode | null
  vaultPath: string
  onClose: () => void
  onRefresh: () => Promise<void>
  onRenameStart: (node: FileNode) => void
  openTab: (path: string, name: string, ext: FileExt, content: string) => void
  onNewFile: (targetDir: string) => void
  onNewFolder: (targetDir: string) => void
}

export function SidebarContextMenu({
  x, y, node, vaultPath, onClose, onRefresh, onRenameStart, onNewFile, onNewFolder
}: SidebarCtxMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const openedAt = useRef(Date.now())
  const { confirm, alert } = useDialog()

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (Date.now() - openedAt.current < 100) return
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const targetDir = node
    ? (node.type === 'folder' ? node.path : node.path.replace(/[/\\][^/\\]+$/, ''))
    : vaultPath

  const run = (fn: () => Promise<void> | void) => {
    onClose()
    const res = fn()
    if (res instanceof Promise) res.catch(console.error)
  }

  const handleRename = () => { onClose(); if (node) onRenameStart(node) }

  const handleDelete = () => run(async () => {
    if (!node) return
    const ok = await confirm({
      title: 'Mover para lixeira',
      message: `"${node.name}" será movido para a lixeira.`,
      variant: 'danger',
      confirmLabel: 'Excluir',
    })
    if (!ok) return
    try {
      await FileSystemService.deleteFile(node.path)
      await onRefresh()
    } catch (err) {
      await alert({ title: 'Erro ao excluir', message: `Não foi possível excluir: ${err}`, variant: 'danger' })
    }
  })

  const handleDuplicate = () => run(async () => {
    if (!node || node.type !== 'file') return
    try {
      const data = await FileSystemService.openFile(node.path)
      if (!data) return
      const dot = node.name.lastIndexOf('.')
      const base = dot > 0 ? node.name.slice(0, dot) : node.name
      const ext  = dot > 0 ? node.name.slice(dot) : ''
      const newPath = await FileSystemService.createFile(targetDir, `${base} (cópia)${ext}`)
      await window.electronAPI.saveFile(newPath, data.content)
      await onRefresh()
    } catch (err) {
      await alert({ title: 'Erro ao duplicar', message: `Não foi possível duplicar: ${err}`, variant: 'danger' })
    }
  })

  const handleReveal = () => run(async () => {
    if (node) FileSystemService.showItemInFolder(node.path)
  })

  const handleRefreshExplorer = () => run(async () => {
    await onRefresh()
  })

  const W = 220, P = 8
  const left = x + W > window.innerWidth  - P ? window.innerWidth  - W - P : x
  const top  = y + 260 > window.innerHeight - P ? Math.max(P, window.innerHeight - 260 - P) : y

  type Item = { icon: React.ReactNode; label: string; action: () => void; danger?: boolean }

  const groups: ((Item[]) | 'sep')[] = [
    [
      { icon: <Icons.NewFile />,   label: 'Novo Arquivo', action: () => run(() => onNewFile(targetDir)) },
      { icon: <Icons.NewFolder />, label: 'Nova Pasta',   action: () => run(() => onNewFolder(targetDir)) },
      { icon: <Icons.Refresh />,   label: 'Atualizar Explorador', action: handleRefreshExplorer },
    ],
  ]

  if (node) {
    groups.push('sep')
    if (node.type === 'file') {
      groups.push([{ icon: <Icons.Duplicate />, label: 'Duplicar', action: handleDuplicate }])
    }
    groups.push([
      { icon: <Icons.Rename />, label: 'Renomear',            action: handleRename },
      { icon: <Icons.Reveal />, label: 'Mostrar no Explorer', action: handleReveal },
    ])
    groups.push('sep')
    groups.push([{ icon: <Icons.Delete />, label: 'Mover para lixeira', action: handleDelete, danger: true }])
  }

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 999999, width: W }}
      className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.55)] overflow-hidden animate-fade-in-scale"
      onClick={e => e.stopPropagation()}
    >
      <div className="py-1">
        {groups.map((g, gi) =>
          g === 'sep'
            ? <div key={`s${gi}`} className="h-px bg-[#3a3a3a] my-1" />
            : <div key={`g${gi}`}>
                {g.map((item, ii) => (
                  <button
                    key={ii}
                    onClick={item.action}
                    className={`w-full text-left px-3 py-[7px] text-[13px] flex items-center gap-2.5 transition-colors duration-100 ${item.danger ? 'text-[#ff6b6b] hover:bg-[#ff4d4d22]' : 'text-[#d4d4d4] hover:bg-[#3a3a3a]'}`}
                  >
                    <span className="opacity-70 flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
        )}
      </div>
    </div>,
    document.body
  )
}
