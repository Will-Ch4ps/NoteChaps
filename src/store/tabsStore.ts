import { create } from 'zustand'
import { EditorState } from 'prosemirror-state'
import { Tab, EditorMode, FileExt } from '../shared/types'
import { generateId } from '../shared/utils'
import { MarkdownConverter } from '../filesystem/converters/MarkdownConverter'
import { createEditorState } from '../editor/core/EditorInstance'
import { parseFrontmatter, serializeFrontmatter } from '../shared/utils/frontmatter'

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
  } catch {
    // ignore local storage errors
  }
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
      const existing = get().tabs.find((tab) => tab.filePath === filePath)
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

    if (!isUntitled) {
      const entry: RecentFile = { filePath, title, openedAt: Date.now() }
      const updated = [entry, ...get().recentFiles.filter((item) => item.filePath !== filePath)].slice(0, MAX_RECENT)
      saveRecentFiles(updated)
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id, recentFiles: updated }))
    } else {
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
    }

    return id
  },

  closeTab: (id) => {
    const tab = get().tabs.find((item) => item.id === id)
    if (!tab) return

    set((state) => {
      const idx = state.tabs.findIndex((item) => item.id === id)
      const newTabs = state.tabs.filter((item) => item.id !== id)
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
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, isDirty: dirty } : tab))
    }))
  },

  updateEditorState: (id, editorState) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, editorState } : tab))
    }))
  },

  updateRawContent: (id, rawContent) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, rawContent } : tab))
    }))
  },

  updateScrollPosition: (id, scrollPosition) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, scrollPosition } : tab))
    }))
  },

  setMode: (id, mode) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== id) return tab

        if (tab.mode === 'visual' && mode === 'raw') {
          const { meta } = parseFrontmatter(tab.rawContent)
          const body = tab.editorState
            ? MarkdownConverter.fromDoc(tab.editorState.doc, { lineMode: 'markdown' })
            : parseFrontmatter(tab.rawContent).body
          const rawContent = serializeFrontmatter(meta, body)
          return { ...tab, mode, rawContent, editorState: null }
        }

        if (tab.mode === 'raw' && mode === 'visual') {
          const { body } = parseFrontmatter(tab.rawContent)
          const doc = body ? MarkdownConverter.toDoc(body, { preserveSoftBreaks: false }) : undefined
          const editorState = createEditorState(doc)
          return { ...tab, mode, editorState }
        }

        return { ...tab, mode }
      })
    }))
  },

  updateTabInfo: (id, filePath, title, ext) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, filePath, title, ext } : tab))
    }))
  },

  toggleTabAutoSave: (id) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, autoSave: !tab.autoSave } : tab))
    }))
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((tab) => tab.id === activeTabId) ?? null
  },

  getTab: (id) => get().tabs.find((tab) => tab.id === id),

  reopenLastClosed: () => {
    const { recentlyClosed } = get()
    if (recentlyClosed.length === 0) return null
    const [last, ...rest] = recentlyClosed
    set((state) => ({
      tabs: [...state.tabs, last],
      activeTabId: last.id,
      recentlyClosed: rest
    }))
    return last.id
  }
}))
