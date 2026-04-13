import { create } from 'zustand'
import { FileNode } from '../shared/types'

interface FilesState {
  vaultPath: string | null
  tree: FileNode[]
  loading: boolean

  setVault: (path: string, tree: FileNode[]) => void
  setTree: (tree: FileNode[]) => void
  setLoading: (loading: boolean) => void
  clearVault: () => void
}

export const useFilesStore = create<FilesState>((set) => ({
  vaultPath: null,
  tree: [],
  loading: false,

  setVault: (vaultPath, tree) => set({ vaultPath, tree }),
  setTree: (tree) => set({ tree }),
  setLoading: (loading) => set({ loading }),
  clearVault: () => set({ vaultPath: null, tree: [] })
}))
