import React, { useState, useEffect, useRef } from 'react'

interface InsertImageModalProps {
  onConfirm: (src: string, alt: string) => void
  onClose: () => void
}

export function InsertImageModal({ onConfirm, onClose }: InsertImageModalProps) {
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!src.trim()) return
    onConfirm(src.trim(), alt.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-[420px] bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#3a3a3a]">
          <h3 className="text-[13px] font-semibold text-[#e0e0e0]">Inserir Imagem</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#888] uppercase tracking-wide">URL da Imagem</label>
            <input
              ref={inputRef}
              type="text"
              value={src}
              onChange={e => setSrc(e.target.value)}
              placeholder="https://exemplo.com/imagem.png"
              className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-md px-3 py-2 text-[13px] text-[#e0e0e0] placeholder-[#555] outline-none focus:border-[#4a9eff] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#888] uppercase tracking-wide">Texto Alternativo <span className="normal-case text-[#555]">(opcional)</span></label>
            <input
              type="text"
              value={alt}
              onChange={e => setAlt(e.target.value)}
              placeholder="Descrição da imagem"
              className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-md px-3 py-2 text-[13px] text-[#e0e0e0] placeholder-[#555] outline-none focus:border-[#4a9eff] transition-colors"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-[12px] text-[#aaa] hover:text-[#e0e0e0] hover:bg-[#3a3a3a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!src.trim()}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium bg-[#4a9eff] text-white hover:bg-[#3a8eef] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Inserir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
