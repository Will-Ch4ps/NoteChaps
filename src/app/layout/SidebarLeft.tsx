import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useFilesStore } from '../../store/filesStore'
import { useTabsStore } from '../../store/tabsStore'
import { FileSystemService } from '../../filesystem/FileSystemService'
import { FileNode, FileExt } from '../../shared/types'
import { base64ToText, basename } from '../../shared/utils'
import { SidebarContextMenu } from './sidebar/SidebarContextMenu'
import { FileTreeNode } from './sidebar/FileTreeNode'
import { useDialog } from '../components/Dialog'

interface CtxMenuState { visible: boolean; x: number; y: number; node: FileNode | null }

const MIN_W = 160
const MAX_W = 480
const DEFAULT_W = 224 // w-56

export function SidebarLeft() {
  const { vaultPath, tree, setVault, setLoading } = useFilesStore()
  const { openTab, tabs } = useTabsStore()
  const { alert } = useDialog()

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>({ visible: false, x: 0, y: 0, node: null })
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [width, setWidth] = useState(DEFAULT_W)
  const dragging = useRef(false)
  const startX   = useRef(0)
  const startW   = useRef(0)

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = width
  }, [width])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current   // drag right = wider
      const next  = Math.min(MAX_W, Math.max(MIN_W, startW.current + delta))
      setWidth(next)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const refreshTree = useCallback(async () => {
    if (!vaultPath) return
    setLoading(true)
    try {
      const newTree = await FileSystemService.loadVaultTree(vaultPath)
      setVault(vaultPath, newTree)
      setLastRefresh(Date.now())
    } catch (err) {
      console.error("Erro ao atualizar árvore:", err)
    } finally {
      setLoading(false)
    }
  }, [vaultPath, setVault, setLoading])

  // ─── Sincronização em tempo real via fs.watch ──────────────────────────
  useEffect(() => {
    if (!vaultPath || !window.electronAPI?.watchVault) return
    
    // Inicia o monitoramento do vault
    window.electronAPI.watchVault(vaultPath)
    
    // Configura o listener para mudanças no vault
    const removeListener = window.electronAPI.onVaultChanged(() => {
      console.log("Vault mudou externamente, atualizando...")
      refreshTree()
    })
    
    // Atualiza a árvore imediatamente na montagem
    refreshTree()
    
    return () => {
      removeListener()
      window.electronAPI.unwatchVault?.()
    }
  }, [vaultPath, refreshTree])

  // Sincronização periódica (a cada 30 segundos) como backup
  useEffect(() => {
    if (!vaultPath) return
    
    const interval = setInterval(() => {
      // Verifica se a última atualização foi há mais de 30 segundos
      if (Date.now() - lastRefresh > 30000) {
        refreshTree()
      }
    }, 30000)
    
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

  // BUG FIX: Evitar window.prompt que falha no Electron, criar provisório e focar rename
  const handleNewFile = async (targetDir?: string | React.MouseEvent) => {
    const dir = typeof targetDir === 'string' ? targetDir : vaultPath
    if (!dir) return
    
    try {
      const newName = `novo-arquivo-${Date.now().toString().slice(-4)}.md`
      const newPath = await FileSystemService.createFile(dir, newName)
      const initialContent = `# Novo Arquivo\n\n`
      await FileSystemService.saveRaw(newPath, initialContent)
      await refreshTree()
      setRenamingPath(newPath)
      openTab(newPath, newName, 'md', initialContent)
    } catch (err) {
      console.error('[NewFile]', err)
      alert({ title: 'Erro ao criar arquivo', message: String(err), variant: 'danger' })
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
    } catch (err) {
      console.error('[NewFolder]', err)
      alert({ title: 'Erro ao criar pasta', message: String(err), variant: 'danger' })
    }
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      const data = await FileSystemService.openFile(filePath)
      if (!data) return
      openTab(data.path, data.name, data.ext as FileExt, base64ToText(data.content))
    } catch (err) {
      console.error('[OpenFile]', err)
      alert({ title: 'Erro ao abrir arquivo', message: String(err), variant: 'danger' })
    }
  }

  // ─── Drag-and-drop: move arquivo entre pastas ─────────────────────────
  const handleMoveFile = useCallback(async (srcPath: string, destDir: string) => {
    try {
      const newPath = await FileSystemService.moveFile(srcPath, destDir)
      const openedTab = tabs.find(t => t.filePath === srcPath)
      if (openedTab) {
        useTabsStore.getState().updateTabInfo(openedTab.id, newPath, basename(newPath), openedTab.ext)
      }
      await refreshTree()
    } catch (err) {
      console.error('[MoveFile]', err)
      alert({ title: 'Erro ao mover arquivo', message: String(err), variant: 'danger' })
    }
  }, [tabs, refreshTree, alert])

  const openCtx = useCallback((e: React.MouseEvent, node: FileNode) => {
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, node })
  }, [])

  const handleSidebarCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, node: null })
  }, [])

  const handleRenameCommit = useCallback(async (node: FileNode, newName: string) => {
    setRenamingPath(null)
    if (!newName || newName === node.name) return
    try {
      await FileSystemService.renameFile(node.path, newName)
      await refreshTree()
      
      // Atualiza o título da aba se o arquivo estiver aberto
      const openedTab = tabs.find(t => t.filePath === node.path)
      if (openedTab) {
        const newPath = node.path.replace(/[/\\][^/\\]+$/, `/${newName}`)
        useTabsStore.getState().updateTabInfo(openedTab.id, newPath, newName, openedTab.ext)
      }
    } catch (err) {
      console.error('[Rename]', err)
      alert({ title: 'Erro ao renomear', message: String(err), variant: 'danger' })
    }
  }, [refreshTree, tabs, alert])

  return (
    <div
      className="sidebar-left-enter flex flex-col bg-[#252526] border-r border-[#3e3e42] select-none shrink-0 relative"
      style={{ width }}
    >
      {/* Resize handle on right edge */}
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
              <button onClick={handleNewFile} title="Novo arquivo" className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </button>
              <button onClick={handleNewFolder} title="Nova pasta" className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
              </button>
              <button onClick={refreshTree} title="Atualizar explorador" className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </button>
            </>
          )}
          <button onClick={handleOpenVault} title="Abrir pasta" className="text-[#cccccc] hover:text-white hover:bg-[#37373d] p-1 rounded transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto py-1 scrollbar-thin" 
        onContextMenu={handleSidebarCtx}
        onDragOver={(e) => {
          if (!vaultPath) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(e) => {
          if (!vaultPath) return
          e.preventDefault()
          const srcPath = e.dataTransfer.getData('text/plain')
          if (!srcPath || srcPath === vaultPath) return
          handleMoveFile(srcPath, vaultPath)
        }}
      >
        {tree.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[#858585] text-xs mb-3">Nenhuma pasta aberta</p>
            <button onClick={handleOpenVault} className="text-[#4daafc] text-xs hover:underline">Abrir Pasta</button>
          </div>
        ) : (
          tree.map(node => (
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
              dirtyPaths={new Set(tabs.filter(t => t.isDirty && t.filePath).map(t => t.filePath))}
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
          onClose={() => setCtxMenu(s => ({ ...s, visible: false }))}
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