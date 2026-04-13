import { EditorState } from 'prosemirror-state'

// ─── File System ───────────────────────────────────────────────────────────

export type FileExt = 'md'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  ext?: FileExt
  children?: FileNode[]
}

export interface FileData {
  path: string
  name: string
  ext: FileExt
  content: string // base64
  mtime: string
  ctime: string
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

export type EditorMode = 'visual' | 'raw'

export interface Tab {
  id: string
  filePath: string
  title: string
  ext: FileExt
  isDirty: boolean
  editorState: EditorState | null
  rawContent: string
  scrollPosition: number
  mode: EditorMode
  autoSave: boolean // cada documento decide se quer auto-save
}

// ─── UI ────────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system'
export type PageMargin = 'normal' | 'narrow' | 'wide'

export interface UIState {
  sidebarLeftOpen: boolean
  sidebarRightOpen: boolean
  theme: Theme
  zoom: number
  pageMargin: PageMargin
}

// ─── Document Properties ───────────────────────────────────────────────────

export interface DocProperties {
  wordCount: number
  charCount: number
  lineCount: number
  mtime?: string
  ctime?: string
  frontmatter?: Record<string, unknown>
  headings: HeadingEntry[]
}

export interface HeadingEntry {
  level: number
  text: string
  pos: number
}

export interface SelectionProperties {
  wordCount: number
  nodeType: string
  marks: string[]
}

// ─── Format Painter ─────────────────────────────────────────────────────────

export type FormatPainterState = {
  active: boolean
  marks: Array<{ type: string; attrs: Record<string, unknown> }>
  blockType?: { name: string; attrs: Record<string, unknown> }
} | null

// ─── Electron API types (window.electronAPI) ───────────────────────────────

export interface ElectronAPI {
  // File System
  openVault: () => Promise<string | null>
  openFile: (filePath?: string) => Promise<FileData | null>
  saveFile: (filePath: string, content: string) => Promise<boolean>
  saveFileAs: (content: string, defaultName: string) => Promise<string | null>
  createFile: (dir: string, name: string) => Promise<string>
  createFolder: (dir: string, name: string) => Promise<string>
  deleteFile: (filePath: string) => Promise<boolean>
  renameFile: (oldPath: string, newName: string) => Promise<string>
  readDir: (dirPath: string) => Promise<FileNode[]>
  watchFile: (filePath: string) => Promise<void>
  unwatchFile: (filePath: string) => Promise<void>
  moveFile: (srcPath: string, destDir: string) => Promise<string>
  watchVault: (vaultPath: string) => Promise<void>
  unwatchVault: () => Promise<void>
  onVaultChanged: (callback: () => void) => () => void

  // Shell
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (filePath: string) => Promise<void>

  // App
  getVersion: () => Promise<string>
  setTitleBarOverlay?: (options: { color: string; symbolColor: string }) => Promise<void>
  getPendingFile?: () => Promise<string | null>
  onOpenFile?: (callback: (filePath: string) => void) => () => void

  // Listeners (Main → Renderer)
  onFileChanged: (callback: (filePath: string) => void) => void
  onMenuAction: (action: string, callback: () => void) => void
  removeMenuListener: (action: string, callback: () => void) => void

  // Spell check
  onSpellSuggestions: (
    callback: (data: { word: string; suggestions: string[] } | null) => void
  ) => () => void
  addToSpellCheckerDictionary: (word: string) => Promise<void>

  /**
   * Substitui a palavra errada atualmente rastreada pelo spellchecker do Chromium.
   * Usa webContents.replaceMisspelling() internamente — mais confiável que
   * busca manual de posição no ProseMirror, pois o Chromium sabe exatamente
   * qual palavra está sublinhada em vermelho no momento do clique direito.
   */
  replaceMisspelling: (word: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}