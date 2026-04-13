import React, { useState } from 'react'

interface InsertTableModalProps {
  onConfirm: (rows: number, cols: number) => void
  onClose: () => void
}

export function InsertTableModal({ onConfirm, onClose }: InsertTableModalProps) {
  const [hovered, setHovered] = useState<{ rows: number; cols: number } | null>(null)
  const MAX = 8

  const current = hovered ?? { rows: 0, cols: 0 }

  const handleSelect = (rows: number, cols: number) => {
    onConfirm(rows, cols)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#2d2d2d] border border-[#4a4a4a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#3a3a3a]">
          <h3 className="text-[13px] font-semibold text-[#e0e0e0]">
            {hovered ? `Tabela ${hovered.rows} × ${hovered.cols}` : 'Inserir Tabela'}
          </h3>
        </div>
        <div className="p-4">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }}
            onMouseLeave={() => setHovered(null)}
          >
            {Array.from({ length: MAX }, (_, row) =>
              Array.from({ length: MAX }, (_, col) => {
                const isActive = row < current.rows && col < current.cols
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`w-6 h-6 rounded border cursor-pointer transition-all duration-75 ${
                      isActive
                        ? 'bg-[#4a9eff44] border-[#4a9eff]'
                        : 'bg-[#1a1a1a] border-[#444] hover:border-[#666]'
                    }`}
                    onMouseEnter={() => setHovered({ rows: row + 1, cols: col + 1 })}
                    onMouseDown={e => { e.preventDefault(); handleSelect(row + 1, col + 1) }}
                  />
                )
              })
            )}
          </div>
          <p className="text-[11px] text-[#555] text-center mt-2">
            {hovered ? `${hovered.rows} linha${hovered.rows !== 1 ? 's' : ''} × ${hovered.cols} coluna${hovered.cols !== 1 ? 's' : ''}` : 'Passe o mouse para selecionar'}
          </p>
        </div>
      </div>
    </div>
  )
}
