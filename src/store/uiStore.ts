import { create } from 'zustand'
import { Theme, PageMargin } from '../shared/types'
import { DEFAULT_UI } from '../shared/constants'

interface UIState {
  sidebarLeftOpen: boolean
  sidebarRightOpen: boolean
  theme: Theme
  zoom: number
  pageMargin: PageMargin
  quickSearchOpen: boolean
  pageWidth: number   // largura da página em px (400–1400), padrão 800
  rawFontSize: number // tamanho da fonte no raw mode (10–24), padrão 14
  findBarOpen: boolean
  findBarMode: 'find' | 'replace'
  shortcutsOpen: boolean

  toggleSidebarLeft: () => void
  toggleSidebarRight: () => void
  setTheme: (theme: Theme) => void
  setZoom: (zoom: number) => void
  setPageMargin: (margin: PageMargin) => void
  toggleQuickSearch: () => void
  setPageWidth: (w: number) => void
  setRawFontSize: (s: number) => void
  openFindBar: (mode?: 'find' | 'replace') => void
  closeFindBar: () => void
  toggleShortcuts: () => void
}

export const useUIStore = create<UIState>((set) => ({
  ...DEFAULT_UI,
  quickSearchOpen: false,
  pageWidth: 800,
  rawFontSize: 14,
  findBarOpen: false,
  findBarMode: 'find',
  shortcutsOpen: false,

  toggleSidebarLeft: () => set(s => ({ sidebarLeftOpen: !s.sidebarLeftOpen })),
  toggleSidebarRight: () => set(s => ({ sidebarRightOpen: !s.sidebarRightOpen })),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
    // Update native Windows titlebar overlay to match theme
    const isLight = theme === 'light'
    window.electronAPI?.setTitleBarOverlay?.({
      color: isLight ? '#f0f0f2' : '#2d2d2d',
      symbolColor: isLight ? '#1c1c1e' : '#aaaaaa',
    })
  },
  setZoom: (zoom) => set({ zoom }),
  setPageMargin: (pageMargin) => set({ pageMargin }),
  toggleQuickSearch: () => set(s => ({ quickSearchOpen: !s.quickSearchOpen })),
  setPageWidth: (pageWidth) => set({ pageWidth: Math.min(1400, Math.max(400, pageWidth)) }),
  setRawFontSize: (rawFontSize) => set({ rawFontSize: Math.min(24, Math.max(10, rawFontSize)) }),
  openFindBar: (mode = 'find') => set({ findBarOpen: true, findBarMode: mode }),
  closeFindBar: () => set({ findBarOpen: false }),
  toggleShortcuts: () => set(s => ({ shortcutsOpen: !s.shortcutsOpen })),
}))
