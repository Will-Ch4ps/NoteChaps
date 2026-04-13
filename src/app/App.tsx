import React, { useEffect } from 'react'
import { QuickSearch } from './QuickSearch'
import { TitleBar } from './layout/TitleBar'
import { TabBar } from './layout/TabBar'
import { Toolbar } from './layout/Toolbar'
import { SidebarLeft } from './layout/SidebarLeft'
import { SidebarRight } from './layout/SidebarRight'
import { StatusBar } from './layout/StatusBar'
import { FindBar } from './layout/FindBar'
import { ShortcutsModal } from './layout/ShortcutsModal'
import { EditorPage } from '../editor/components/EditorPage'
import { useUIStore } from '../store/uiStore'
import { useTabsStore } from '../store/tabsStore'
import { useEditorStore } from '../store/editorStore'
import { useFilesStore } from '../store/filesStore'
import { FileSystemService } from '../filesystem/FileSystemService'
import { FileExt } from '../shared/types'
import { base64ToText, textToBase64, basename, getFileExt, debounce } from '../shared/utils'
import { AUTO_SAVE_DELAY } from '../shared/constants'

export function App() {
  const { sidebarLeftOpen, sidebarRightOpen, toggleQuickSearch, openFindBar, toggleShortcuts, theme } = useUIStore()
  const { openTab, reopenLastClosed } = useTabsStore()

  // Sync native titlebar overlay color on mount and theme change
  useEffect(() => {
    const isLight = theme === 'light'
    window.electronAPI?.setTitleBarOverlay?.({
      color: isLight ? '#f0f0f2' : '#2d2d2d',
      symbolColor: isLight ? '#1c1c1e' : '#aaaaaa',
    })
  }, [theme])

  useEffect(() => {
    if (!window.electronAPI) return

    // BUG FIX: Recupera a pasta que estava aberta antes do F5 (Reload)
    const savedVault = localStorage.getItem('notechaps-vault')
    if (savedVault) {
      FileSystemService.loadVaultTree(savedVault)
        .then(tree => {
          useFilesStore.getState().setVault(savedVault, tree)
        })
        .catch(() => localStorage.removeItem('notechaps-vault')) // Se a pasta foi apagada do PC
    }

    let untitledCounter = 1

    const handleNewFile = () => {
      const name = `sem título ${untitledCounter++}.md`
      openTab(`untitled:${name}`, name, 'md', '')
    }

    const handleOpenFile = async () => {
      const data = await FileSystemService.openFile()
      if (!data) return
      const content = base64ToText(data.content)
      openTab(data.path, data.name, data.ext as FileExt, content)
    }

    const handleSave = async () => {
      const tab = useTabsStore.getState().getActiveTab()
      if (!tab) return

      if (tab.filePath.startsWith('untitled:')) {
        const { activeView } = useEditorStore.getState()
        let newPath: string | null = null;

        if (activeView && tab.mode === 'visual') {
          newPath = await FileSystemService.saveAs(activeView.state.doc, tab.title)
        } else {
          const base64 = textToBase64(tab.rawContent)
          newPath = await window.electronAPI.saveFileAs(base64, tab.title)
        }

        if (newPath) {
          const store = useTabsStore.getState();
          store.updateTabInfo(tab.id, newPath, basename(newPath), getFileExt(newPath));
          store.markDirty(tab.id, false);
        }
        return
      }

      if (tab.mode === 'visual') {
        const { activeView } = useEditorStore.getState()
        if (activeView) {
          await FileSystemService.saveDoc(tab.filePath, activeView.state.doc)
          useTabsStore.getState().markDirty(tab.id, false)
        }
      } else {
        await FileSystemService.saveRaw(tab.filePath, tab.rawContent)
        useTabsStore.getState().markDirty(tab.id, false)
      }
    }

    const handleOpenVault = async () => {
      const path = await FileSystemService.openVault()
      if (path) {
        localStorage.setItem('notechaps-vault', path)
        const tree = await FileSystemService.loadVaultTree(path)
        useFilesStore.getState().setVault(path, tree)
      }
    }

    const handleSaveAs = async () => {
      const tab = useTabsStore.getState().getActiveTab()
      if (!tab) return

      const { activeView } = useEditorStore.getState()
      let newPath: string | null = null;

      if (activeView && tab.mode === 'visual') {
        newPath = await FileSystemService.saveAs(activeView.state.doc, tab.title)
      } else {
        const base64 = textToBase64(tab.rawContent)
        newPath = await window.electronAPI.saveFileAs(base64, tab.title)
      }

      if (newPath) {
        const store = useTabsStore.getState();
        store.updateTabInfo(tab.id, newPath, basename(newPath), getFileExt(newPath));
        store.markDirty(tab.id, false);
      }
    }

    useEditorStore.getState().setAppActions({
      newFile: handleNewFile,
      openFile: handleOpenFile,
      save: handleSave
    })

    window.electronAPI.onMenuAction('newFile', handleNewFile)
    window.electronAPI.onMenuAction('openFile', handleOpenFile)
    window.electronAPI.onMenuAction('save', handleSave)
    window.electronAPI.onMenuAction('saveAs', handleSaveAs)
    window.electronAPI.onMenuAction('openVault', handleOpenVault)

    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'n') { e.preventDefault(); handleNewFile(); }
      if (mod && !e.shiftKey && e.key === 'o') { e.preventDefault(); handleOpenFile(); }
      if (mod && e.key === 'e') {
        e.preventDefault()
        const { getActiveTab, setMode } = useTabsStore.getState()
        const tab = getActiveTab()
        if (tab) setMode(tab.id, tab.mode === 'visual' ? 'raw' : 'visual')
      }
      if (mod && e.key === 'p') { e.preventDefault(); toggleQuickSearch(); }
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); openFindBar('find'); }
      if (mod && e.key === 'h') { e.preventDefault(); openFindBar('replace'); }
      if (mod && e.key === '?') { e.preventDefault(); toggleShortcuts(); }
      if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); toggleQuickSearch(); }
      if (mod && e.altKey && e.key === 'b') {
        e.preventDefault()
        useUIStore.getState().toggleSidebarLeft()
      }
      if (mod && e.altKey && e.key === 'r') {
        e.preventDefault()
        useUIStore.getState().toggleSidebarRight()
      }
      if (mod && e.key === 'w') {
        e.preventDefault()
        const { getActiveTab, closeTab } = useTabsStore.getState()
        const tab = getActiveTab()
        if (tab) closeTab(tab.id)
      }
      if (mod && e.shiftKey && e.key === 'T') { e.preventDefault(); reopenLastClosed(); }
      if (mod && e.key === 's') {
        e.preventDefault()
        if (e.shiftKey) handleSaveAs()
        else handleSave()
      }
    }

    // Ctrl+Scroll: zoom do documento
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const { zoom, setZoom } = useUIStore.getState()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      setZoom(Math.min(3, Math.max(0.5, Math.round((zoom + delta) * 10) / 10)))
    }

    // Auto-save por documento: dispara quando o tab fica dirty e tab.autoSave está ativo
    const debouncedSave = debounce(() => {
      const tab = useTabsStore.getState().getActiveTab()
      if (tab?.autoSave && tab.isDirty && !tab.filePath.startsWith('untitled:')) handleSave()
    }, AUTO_SAVE_DELAY)

    const unsubscribeTabs = useTabsStore.subscribe((state) => {
      const tab = state.tabs.find(t => t.id === state.activeTabId)
      if (tab?.isDirty && tab?.autoSave) debouncedSave()
    })

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
      unsubscribeTabs()
      window.electronAPI.removeMenuListener('newFile', handleNewFile)
      window.electronAPI.removeMenuListener('openFile', handleOpenFile)
      window.electronAPI.removeMenuListener('save', handleSave)
      window.electronAPI.removeMenuListener('saveAs', handleSaveAs)
      window.electronAPI.removeMenuListener('openVault', handleOpenVault)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#1a1a1a] text-[#e0e0e0] font-ui">
      <QuickSearch />
      <ShortcutsModal />
      <TitleBar />
      <Toolbar />
      <TabBar />
      <FindBar />

      <div className="flex flex-1 overflow-hidden">
        {sidebarLeftOpen && <SidebarLeft />}
        <EditorPage />
        {sidebarRightOpen && <SidebarRight />}
      </div>

      <StatusBar />
    </div>
  )
}