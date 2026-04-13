import { create } from 'zustand'
import { EditorView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'
import { DocProperties, SelectionProperties, FormatPainterState } from '../shared/types'

export interface ActiveDiagram {
  code: string
  pos: number
}

export interface ActiveTable {
  node: PMNode
  pos: number
}

interface EditorStore {
  docProperties: DocProperties | null
  selectionProperties: SelectionProperties | null
  activeView: EditorView | null
  formatPainter: FormatPainterState
  activeDiagram: ActiveDiagram | null
  activeTable: ActiveTable | null

  // Ações globais registradas pelo App para uso em Toolbar etc.
  appActions: {
    newFile?: () => void
    openFile?: () => void
    save?: () => void
  }

  setDocProperties: (props: DocProperties) => void
  setSelectionProperties: (props: SelectionProperties | null) => void
  setActiveView: (view: EditorView | null) => void
  setAppActions: (actions: EditorStore['appActions']) => void
  setFormatPainter: (state: FormatPainterState) => void
  setActiveDiagram: (diagram: ActiveDiagram | null) => void
  setActiveTable: (table: ActiveTable | null) => void
  clearProperties: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  docProperties: null,
  selectionProperties: null,
  activeView: null,
  formatPainter: null,
  activeDiagram: null,
  activeTable: null,
  appActions: {},

  setDocProperties: (docProperties) => set({ docProperties }),
  setSelectionProperties: (selectionProperties) => set({ selectionProperties }),
  setActiveView: (activeView) => set({ activeView }),
  setAppActions: (appActions) => set({ appActions }),
  setFormatPainter: (formatPainter) => set({ formatPainter }),
  setActiveDiagram: (activeDiagram) => set({ activeDiagram }),
  setActiveTable: (activeTable) => set({ activeTable }),
  clearProperties: () => set({ docProperties: null, selectionProperties: null, activeView: null, formatPainter: null, activeDiagram: null, activeTable: null })
}))
