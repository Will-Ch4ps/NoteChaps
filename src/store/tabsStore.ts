import { create } from 'zustand'
import { Tab, EditorMode, FileExt } from '../shared/types'
import { generateId } from '../shared/utils'
import { EditorState } from 'prosemirror-state'
import { MarkdownConverter } from '../filesystem/converters/MarkdownConverter'
import { createEditorState } from '../editor/core/EditorInstance'

const RECENT_FILES_KEY = 'notechaps_recent_files'
const MAX_RECENT = 12

interface RecentFile {
  filePath: string
  title: string
  openedAt: number
}

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentFiles(files: RecentFile[]) {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files))
  } catch { /* ignore */ }
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
  recentlyClosed: Tab[]
  recentFiles: RecentFile[]

  openTab: (filePath: string, title: string, ext: FileExt, rawContent: string) => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  markDirty: (id: string, dirty: boolean) => void
  updateEditorState: (id: string, state: EditorState) => void
  updateRawContent: (id: string, content: string) => void
  updateScrollPosition: (id: string, pos: number) => void
  setMode: (id: string, mode: EditorMode) => void
  updateTabInfo: (id: string, filePath: string, title: string, ext: FileExt) => void
  toggleTabAutoSave: (id: string) => void
  getActiveTab: () => Tab | null
  getTab: (id: string) => Tab | undefined
  reopenLastClosed: () => string | null
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  recentlyClosed: [],
  recentFiles: loadRecentFiles(),

  openTab: (filePath, title, ext, rawContent) => {
    const isUntitled = filePath.startsWith('untitled:') || filePath === 'untitled.md'

    if (!isUntitled) {
      const existing = get().tabs.find(t => t.filePath === filePath)
      if (existing) {
        set({ activeTabId: existing.id })
        return existing.id
      }
    }

    const id = generateId()
    const finalPath = isUntitled ? `untitled:${id}` : filePath
    const tab: Tab = {
      id,
      filePath: finalPath,
      title,
      ext,
      isDirty: false,
      editorState: null,
      rawContent,
      scrollPosition: 0,
      mode: 'visual',
      autoSave: false
    }

    // Persist to recent files (non-untitled only)
    if (!isUntitled) {
      const entry: RecentFile = { filePath, title, openedAt: Date.now() }
      const updated = [entry, ...get().recentFiles.filter(f => f.filePath !== filePath)].slice(0, MAX_RECENT)
      saveRecentFiles(updated)
      set(state => ({ tabs: [...state.tabs, tab], activeTabId: id, recentFiles: updated }))
    } else {
      set(state => ({ tabs: [...state.tabs, tab], activeTabId: id }))
    }
    return id
  },

  closeTab: (id) => {
    const tab = get().tabs.find(t => t.id === id)
    if (!tab) return

    set(state => {
      const idx = state.tabs.findIndex(t => t.id === id)
      const newTabs = state.tabs.filter(t => t.id !== id)
      const newClosed = [tab, ...state.recentlyClosed].slice(0, 20)

      let newActive = state.activeTabId
      if (state.activeTabId === id) {
        const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
        newActive = next?.id ?? null
      }

      return { tabs: newTabs, activeTabId: newActive, recentlyClosed: newClosed }
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  markDirty: (id, dirty) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, isDirty: dirty } : t)
    }))
  },

  updateEditorState: (id, editorState) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, editorState } : t)
    }))
  },

  updateRawContent: (id, rawContent) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, rawContent } : t)
    }))
  },

  updateScrollPosition: (id, scrollPosition) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, scrollPosition } : t)
    }))
  },

  setMode: (id, mode) => {
    set(state => ({
      tabs: state.tabs.map(t => {
        if (t.id !== id) return t

        // ── Visual → Raw ────────────────────────────────────────────────
        // Serializa o doc atual para markdown limpo.
        if (t.mode === 'visual' && mode === 'raw') {
          const rawContent = t.editorState
            ? MarkdownConverter.fromDoc(t.editorState.doc)
            : t.rawContent
          // Descarta o editorState cacheado para forçar re-parse ao voltar
          return { ...t, mode, rawContent, editorState: null }
        }

        // ── Raw → Visual ────────────────────────────────────────────────
        // SEMPRE recria o editorState a partir do rawContent atual.
        //
        // BUG FIX CRÍTICO: Nunca reutiliza editorState cacheado ao entrar
        // no visual. O rawContent pode ter sido editado manualmente no raw,
        // e o editorState antigo não reflete essas mudanças.
        //
        // Adicionalmente, ao descartar o editorState no Visual→Raw acima,
        // garantimos que este branch sempre executa o parse limpo.
        if (t.mode === 'raw' && mode === 'visual') {
          const doc = t.rawContent
            ? MarkdownConverter.toDoc(t.rawContent)
            : undefined
          const editorState = createEditorState(doc)
          return { ...t, mode, editorState }
        }

        return { ...t, mode }
      })
    }))
  },

  updateTabInfo: (id, filePath, title, ext) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, filePath, title, ext } : t)
    }))
  },

  toggleTabAutoSave: (id) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, autoSave: !t.autoSave } : t)
    }))
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find(t => t.id === activeTabId) ?? null
  },

  getTab: (id) => {
    return get().tabs.find(t => t.id === id)
  },

  reopenLastClosed: () => {
    const { recentlyClosed } = get()
    if (recentlyClosed.length === 0) return null
    const [last, ...rest] = recentlyClosed
    set(state => ({
      tabs: [...state.tabs, last],
      activeTabId: last.id,
      recentlyClosed: rest
    }))
    return last.id
  }
}))