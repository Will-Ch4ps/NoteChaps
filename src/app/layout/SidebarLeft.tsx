import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { FileSystemService } from '../../filesystem/FileSystemService'
import { base64ToText, basename } from '../../shared/utils'
import { FileExt, FileNode } from '../../shared/types'
import { useFilesStore } from '../../store/filesStore'
import { useTabsStore } from '../../store/tabsStore'
import { useDialog } from '../components/Dialog'
import { FileTreeNode } from './sidebar/FileTreeNode'
import { SidebarContextMenu } from './sidebar/SidebarContextMenu'
import { buildNewDocumentContent } from '../../shared/documents/newDocument'

interface CtxMenuState {
  visible: boolean
  x: number
  y: number
  node: FileNode | null
}

const MIN_W = 160
const MAX_W = 480
const DEFAULT_W = 224
const SIDEBAR_WIDTH_KEY = 'notechaps-sidebar-left-width'

function loadInitialWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (!raw) return DEFAULT_W
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return DEFAULT_W
    return Math.min(MAX_W, Math.max(MIN_W, parsed))
  } catch {
    return DEFAULT_W
  }
}

export function SidebarLeft() {
  const { vaultPath, tree, setVault, setLoading } = useFilesStore(
    (state) => ({
      vaultPath: state.vaultPath,
      tree: state.tree,
      setVault: state.setVault,
      setLoading: state.setLoading
    }),
    shallow
  )
  const { tabs, openTab, updateTabInfo } = useTabsStore(
    (state) => ({
      tabs: state.tabs,
      openTab: state.openTab,
      updateTabInfo: state.updateTabInfo
    }),
    shallow
  )
  const { alert } = useDialog()

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>({ visible: false, x: 0, y: 0, node: null })
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [width, setWidth] = useState(loadInitialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)
  const refreshInFlightRef = useRef(false)
  const refreshPendingRef = useRef(false)
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dirtyPaths = useMemo(
    () => new Set(tabs.filter((tab) => tab.isDirty && tab.filePath).map((tab) => tab.filePath)),
    [tabs]
  )

  const onHandleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      dragging.current = true
      startX.current = event.clientX
      startW.current = width
    },
    [width]
  )

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return
      const delta = event.clientX - startX.current
      const next = Math.min(MAX_W, Math.max(MIN_W, startW.current + delta))
      setWidth(next)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width))
    } catch {
      // ignore storage errors
    }
  }, [width])

  const refreshTree = useCallback(async () => {
    if (!vaultPath) return

    if (refreshInFlightRef.current) {
      refreshPendingRef.current = true
      return
    }

    refreshInFlightRef.current = true
    setLoading(true)

    try {
      const newTree = await FileSystemService.loadVaultTree(vaultPath)
      setVault(vaultPath, newTree)
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('[SidebarLeft] Tree refresh failed:', error)
    } finally {
      refreshInFlightRef.current = false
      setLoading(false)
      if (refreshPendingRef.current) {
        refreshPendingRef.current = false
        refreshTree()
      }
    }
  }, [vaultPath, setVault, setLoading])

  const scheduleRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    refreshDebounceRef.current = setTimeout(() => {
      refreshTree()
    }, 220)
  }, [refreshTree])

  useEffect(() => {
    if (!vaultPath || !window.electronAPI?.watchVault) return

    window.electronAPI.watchVault(vaultPath)
    const removeListener = window.electronAPI.onVaultChanged(() => {
      scheduleRefresh()
    })
    refreshTree()

    return () => {
      removeListener()
      window.electronAPI.unwatchVault?.()
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current)
        refreshDebounceRef.current = null
      }
    }
  }, [vaultPath, refreshTree, scheduleRefresh])

  useEffect(() => {
    if (!vaultPath) return

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefresh > 120000) {
        refreshTree()
      }
    }, 120000)

    return () => clearInterval(interval)
  }, [vaultPath, lastRefresh, refreshTree])

  const handleOpenVault = async () => {
    setLoading(true)
    try {
      const path = await FileSystemService.openVault()
      if (path) {
        localStorage.setItem('notechaps-vault', path)
        const newTree = await FileSystemService.loadVaultTree(path)
        setVault(path, newTree)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNewFile = async (targetDir?: string | React.MouseEvent) => {
    const dir = typeof targetDir === 'string' ? targetDir : vaultPath
    if (!dir) return

    try {
      const newName = `novo-arquivo-${Date.now().toString().slice(-4)}.md`
      const newPath = await FileSystemService.createFile(dir, newName)
      const initialContent = buildNewDocumentContent(newName.replace(/\.md$/i, ''))
      await FileSystemService.saveRaw(newPath, initialContent)
      await refreshTree()
      setRenamingPath(newPath)
      openTab(newPath, newName, 'md', initialContent)
    } catch (error) {
      console.error('[SidebarLeft][NewFile]', error)
      alert({ title: 'Erro ao criar arquivo', message: String(error), variant: 'danger' })
    }
  }

  const handleNewFolder = async (targetDir?: string | React.MouseEvent) => {
    const dir = typeof targetDir === 'string' ? targetDir : vaultPath
    if (!dir) return

    try {
      const newName = `nova-pasta-${Date.now().toString().slice(-4)}`
      const newPath = await FileSystemService.createFolder(dir, newName)
      await refreshTree()
      setRenamingPath(newPath)
    } catch (error) {
      console.error('[SidebarLeft][NewFolder]', error)
      alert({ title: 'Erro ao criar pasta', message: String(error), variant: 'danger' })
    }
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      const data = await FileSystemService.openFile(filePath)
      if (!data) return
      openTab(data.path, data.name, data.ext as FileExt, base64ToText(data.content))
    } catch (error) {
      console.error('[SidebarLeft][OpenFile]', error)
      alert({ title: 'Erro ao abrir arquivo', message: String(error), variant: 'danger' })
    }
  }

  const handleMoveFile = useCallback(
    async (srcPath: string, destDir: string) => {
      try {
        const newPath = await FileSystemService.moveFile(srcPath, destDir)
        const openedTab = tabs.find((tab) => tab.filePath === srcPath)
        if (openedTab) {
          updateTabInfo(openedTab.id, newPath, basename(newPath), openedTab.ext)
        }
        await refreshTree()
      } catch (error) {
        console.error('[SidebarLeft][MoveFile]', error)
        alert({ title: 'Erro ao mover arquivo', message: String(error), variant: 'danger' })
      }
    },
    [tabs, refreshTree, alert, updateTabInfo]
  )

  const openCtx = useCallback((event: React.MouseEvent, node: FileNode) => {
    setCtxMenu({ visible: true, x: event.clientX, y: event.clientY, node })
  }, [])

  const handleSidebarCtx = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setCtxMenu({ visible: true, x: event.clientX, y: event.clientY, node: null })
  }, [])

  const handleRenameCommit = useCallback(
    async (node: FileNode, newName: string) => {
      setRenamingPath(null)
      if (!newName || newName === node.name) return

      try {
        const renamedPath = await FileSystemService.renameFile(node.path, newName)
        await refreshTree()

        const openedTab = tabs.find((tab) => tab.filePath === node.path)
        if (openedTab) {
          updateTabInfo(openedTab.id, renamedPath, newName, openedTab.ext)
        }
      } catch (error) {
        console.error('[SidebarLeft][Rename]', error)
        alert({ title: 'Erro ao renomear', message: String(error), variant: 'danger' })
      }
    },
    [refreshTree, tabs, alert, updateTabInfo]
  )

  return (
    <div
      className="sidebar-left-enter flex flex-col bg-[#252526] border-r border-[#3e3e42] select-none shrink-0 relative"
      style={{ width }}
    >
      <div
        onMouseDown={onHandleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[#4a9eff] transition-colors"
        style={{ marginRight: -2 }}
      />

      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-[#3e3e42]">
        <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide">Explorador</span>
        <div className="flex items-center gap-0.5">
          {vaultPath && (
            <>
              <button
                onClick={handleNewFile}
                title="Novo arquivo"
                className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </button>
              <button
                onClick={handleNewFolder}
                title="Nova pasta"
                className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
              <button
                onClick={refreshTree}
                title="Atualizar explorador"
                className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={handleOpenVault}
            title="Abrir pasta"
            className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1 scrollbar-thin"
        onContextMenu={handleSidebarCtx}
        onDragOver={(event) => {
          if (!vaultPath) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(event) => {
          if (!vaultPath) return
          event.preventDefault()
          const srcPath = event.dataTransfer.getData('text/plain')
          if (!srcPath || srcPath === vaultPath) return
          handleMoveFile(srcPath, vaultPath)
        }}
      >
        {tree.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[#858585] text-xs mb-3">Nenhuma pasta aberta</p>
            <button onClick={handleOpenVault} className="text-[#4daafc] text-xs hover:underline">
              Abrir Pasta
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              onOpen={handleOpenFile}
              onContextMenu={openCtx}
              onMoveFile={handleMoveFile}
              renamingPath={renamingPath}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={() => setRenamingPath(null)}
              dirtyPaths={dirtyPaths}
            />
          ))
        )}
      </div>

      {ctxMenu.visible && vaultPath && (
        <SidebarContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          node={ctxMenu.node}
          vaultPath={vaultPath}
          onClose={() => setCtxMenu((state) => ({ ...state, visible: false }))}
          onRefresh={refreshTree}
          onRenameStart={(node) => setRenamingPath(node.path)}
          openTab={(path, name, ext, content) => openTab(path, name, ext, content)}
          onNewFile={(targetDir) => handleNewFile(targetDir)}
          onNewFolder={(targetDir) => handleNewFolder(targetDir)}
        />
      )}
    </div>
  )
}
