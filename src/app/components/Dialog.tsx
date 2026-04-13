import React, { createContext, useContext, useCallback, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogVariant = 'info' | 'warning' | 'danger' | 'success'

interface DialogOptions {
  title: string
  message: string
  variant?: DialogVariant
  confirmLabel?: string
  cancelLabel?: string
  /** If false, shows only a single "OK" button (no cancel) */
  showCancel?: boolean
  /** Optional input field */
  input?: {
    placeholder?: string
    defaultValue?: string
    label?: string
  }
}

interface DialogState extends DialogOptions {
  resolve: (value: string | boolean | null) => void
}

interface DialogContextValue {
  confirm: (opts: DialogOptions) => Promise<boolean>
  alert: (opts: Omit<DialogOptions, 'showCancel' | 'cancelLabel'>) => Promise<void>
  prompt: (opts: DialogOptions & { input: NonNullable<DialogOptions['input']> }) => Promise<string | null>
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const VariantIcon = ({ variant }: { variant: DialogVariant }) => {
  const map: Record<DialogVariant, { color: string; path: string }> = {
    danger:  { color: '#ff6b6b', path: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
    warning: { color: '#f59e0b', path: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
    info:    { color: '#4a9eff', path: 'M12 16v-4m0-4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z' },
    success: { color: '#30d158', path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3' },
  }
  const { color, path } = map[variant]
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  )
}

// ─── Modal UI ────────────────────────────────────────────────────────────────

function DialogModal({ state, onDone }: { state: DialogState; onDone: () => void }) {
  const [inputValue, setInputValue] = useState(state.input?.defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const variant = state.variant ?? 'info'

  const confirmBtnColors: Record<DialogVariant, string> = {
    danger:  'bg-[#c0392b] hover:bg-[#a93226] text-white',
    warning: 'bg-[#d97706] hover:bg-[#b45309] text-white',
    info:    'bg-[#4a9eff] hover:bg-[#3a8eef] text-white',
    success: 'bg-[#30d158] hover:bg-[#28c04d] text-white',
  }

  const handleConfirm = () => {
    if (state.input) {
      state.resolve(inputValue.trim() || null)
    } else {
      state.resolve(true)
    }
    onDone()
  }

  const handleCancel = () => {
    state.resolve(state.input ? null : false)
    onDone()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleConfirm()
    if (e.key === 'Escape') handleCancel()
  }

  // Auto-focus input or confirm button
  React.useEffect(() => {
    if (state.input && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const showCancel = state.showCancel !== false

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div
        className="bg-[#252526] border border-[#3e3e42] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] w-[440px] max-w-[90vw] animate-dialog-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <VariantIcon variant={variant} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-[#e0e0e0] leading-tight">{state.title}</h2>
            {state.message && (
              <p className="text-[13px] text-[#888] mt-1 leading-relaxed whitespace-pre-wrap">{state.message}</p>
            )}
          </div>
        </div>

        {/* Input field */}
        {state.input && (
          <div className="px-5 pb-3">
            {state.input.label && (
              <label className="block text-[11px] text-[#888] uppercase tracking-wide mb-1">{state.input.label}</label>
            )}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={state.input.placeholder ?? ''}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] text-[#e0e0e0] text-[13px] rounded-lg px-3 py-2 outline-none focus:border-[#4a9eff] transition-colors"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#3e3e42]">
          {showCancel && (
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-lg text-[13px] text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#37373d] transition-colors"
            >
              {state.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button
            autoFocus={!state.input}
            onClick={handleConfirm}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${confirmBtnColors[variant]}`}
          >
            {state.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<DialogState[]>([])

  const open = useCallback((opts: DialogOptions): Promise<string | boolean | null> => {
    return new Promise((resolve) => {
      setStack(s => [...s, { ...opts, resolve }])
    })
  }, [])

  const dismiss = useCallback(() => {
    setStack(s => s.slice(0, -1))
  }, [])

  const confirm = useCallback(async (opts: DialogOptions): Promise<boolean> => {
    const result = await open({ showCancel: true, ...opts })
    return result === true
  }, [open])

  const alert = useCallback(async (opts: Omit<DialogOptions, 'showCancel' | 'cancelLabel'>): Promise<void> => {
    await open({ ...opts, showCancel: false })
  }, [open])

  const prompt = useCallback(async (opts: DialogOptions & { input: NonNullable<DialogOptions['input']> }): Promise<string | null> => {
    const result = await open({ showCancel: true, ...opts })
    return typeof result === 'string' ? result : null
  }, [open])

  const current = stack[stack.length - 1] ?? null

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      {current && <DialogModal key={stack.length} state={current} onDone={dismiss} />}
    </DialogContext.Provider>
  )
}
