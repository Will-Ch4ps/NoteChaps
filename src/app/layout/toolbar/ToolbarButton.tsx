import React from 'react'

// ─── ToolbarButton ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'painter'
}

export function ToolbarButton({
  title, active, disabled, onClick, children, variant = 'default'
}: ToolbarButtonProps) {
  const base = `flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-all duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed`

  const styles: Record<string, string> = {
    default: active
      ? 'bg-[#4a9eff33] text-[#4a9eff] shadow-sm'
      : 'text-[#aaa] hover:bg-[#3a3a3a] hover:text-[#e0e0e0] hover:shadow-sm',
    primary: 'bg-[#4a9eff] text-white hover:bg-[#3a8eef] shadow-md',
    success: 'bg-[#30d158] text-white hover:bg-[#28c04d] shadow-md',
    painter: active
      ? 'bg-[#ff9f0a33] text-[#ff9f0a] shadow-sm ring-1 ring-[#ff9f0a66]'
      : 'text-[#aaa] hover:bg-[#3a3a3a] hover:text-[#e0e0e0] hover:shadow-sm',
  }

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]}`}
      aria-label={title}
    >
      {children}
    </button>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="w-px h-6 bg-gradient-to-b from-transparent via-[#444] to-transparent mx-2" />
}

// ─── ToolbarGroup ─────────────────────────────────────────────────────────────

export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 px-1">{children}</div>
}
