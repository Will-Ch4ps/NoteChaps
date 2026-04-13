export const AUTO_SAVE_DELAY = 2000 // ms

export const ALLOWED_EXTENSIONS = ['md'] as const

export const DEFAULT_UI = {
  sidebarLeftOpen: true,
  sidebarRightOpen: true,
  theme: 'dark' as const,
  zoom: 1,
  pageMargin: 'normal' as const
}

export const PAGE_MARGINS = {
  normal: { horizontal: '80px', vertical: '60px' },
  narrow: { horizontal: '40px', vertical: '40px' },
  wide: { horizontal: '120px', vertical: '80px' }
}

export const RECENTLY_CLOSED_MAX = 20
