import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Node as PMNode } from 'prosemirror-model'
import { EditorView } from 'prosemirror-view'
import { schema } from '../../../../editor/core/schema'
import { useEditorStore } from '../../../../store/editorStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCell(isHeader: boolean, text = '') {
  const content = text
    ? schema.nodes.paragraph.create(null, schema.text(text))
    : schema.nodes.paragraph.create(null)
  return isHeader
    ? schema.nodes.table_header.create(null, content)
    : schema.nodes.table_cell.create(null, content)
}

function extractData(node: PMNode): string[][] {
  const rows: string[][] = []
  for (let r = 0; r < node.childCount; r++) {
    const row = node.child(r)
    const cells: string[] = []
    for (let c = 0; c < row.childCount; c++) cells.push(row.child(c).textContent)
    rows.push(cells)
  }
  return rows
}

function buildNode(data: string[][]): PMNode {
  return schema.nodes.table.create(null,
    data.map((row, r) =>
      schema.nodes.table_row.create(null, row.map(text => makeCell(r === 0, text)))
    )
  )
}

function applyData(view: EditorView, pos: number, data: string[][]): PMNode | null {
  const doc = view.state.doc
  let bounds: { start: number; end: number } | null = null
  doc.nodesBetween(0, doc.content.size, (n, p) => {
    if (p === pos && n.type === schema.nodes.table) {
      bounds = { start: p, end: p + n.nodeSize }
      return false
    }
    return true
  })
  if (!bounds) return null
  const b = bounds as { start: number; end: number }
  const newNode = buildNode(data)
  view.dispatch(view.state.tr.replaceWith(b.start, b.end, newNode))
  return newNode
}

// ─── TablePanel ───────────────────────────────────────────────────────────────

export function TablePanel() {
  const { activeTable, activeView, setActiveTable } = useEditorStore()
  const [data, setData] = useState<string[][]>([])
  const [copied, setCopied] = useState(false)
  const focusedCell = useRef<{ r: number; c: number } | null>(null)

  useEffect(() => {
    if (activeTable) setData(extractData(activeTable.node))
  }, [activeTable])

  const commit = useCallback((newData: string[][]) => {
    if (!activeTable || !activeView) return
    const newNode = applyData(activeView, activeTable.pos, newData)
    if (newNode) setActiveTable({ ...activeTable, node: newNode })
  }, [activeTable, activeView, setActiveTable])

  const updateCell = (r: number, c: number, val: string) => {
    const next = data.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? val : cell))
    setData(next)
    commit(next)
  }

  const focusCell = (r: number, c: number) => {
    const rows = data.length
    const cols = data[0]?.length ?? 0
    // clamp to valid bounds
    const tr = Math.max(0, Math.min(rows - 1, r))
    const tc = Math.max(0, Math.min(cols - 1, c))
    // query by data attribute set on each input
    const el = document.querySelector<HTMLInputElement>(`[data-cell="${tr}-${tc}"]`)
    el?.focus()
    el?.select()
  }

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const cols = data[0]?.length ?? 0
    const rows = data.length

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Tab: go to previous cell
        if (c > 0) focusCell(r, c - 1)
        else if (r > 0) focusCell(r - 1, cols - 1)
      } else {
        // Tab: go to next cell
        if (c < cols - 1) focusCell(r, c + 1)
        else if (r < rows - 1) focusCell(r + 1, 0)
      }
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (r < rows - 1) focusCell(r + 1, c)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCell(r - 1, c)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusCell(r + 1, c)
      return
    }
    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault()
        focusCell(r, c - 1)
      }
      return
    }
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        e.preventDefault()
        focusCell(r, c + 1)
      }
    }
  }

  const copyMarkdown = () => {
    if (!data.length) return
    const colWidths = data[0].map((_, ci) =>
      Math.max(...data.map(r => (r[ci] ?? '').length), 3)
    )
    const fmt = (cells: string[]) =>
      '| ' + cells.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |'
    const sep = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |'
    const md = [fmt(data[0]), sep, ...data.slice(1).map(fmt)].join('\n')
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const addRow = () => {
    const cols = data[0]?.length ?? 1
    const next = [...data, Array<string>(cols).fill('')]
    setData(next); commit(next)
  }

  const removeRow = (r: number) => {
    if (data.length <= 1) return
    const next = data.filter((_, i) => i !== r)
    setData(next); commit(next)
  }

  const addCol = () => {
    const next = data.map((row, r) => [...row, r === 0 ? `Col ${row.length + 1}` : ''])
    setData(next); commit(next)
  }

  const removeCol = (c: number) => {
    if ((data[0]?.length ?? 0) <= 1) return
    const next = data.map(row => row.filter((_, i) => i !== c))
    setData(next); commit(next)
  }

  if (!activeTable) return null

  const rows = data.length
  const cols = data[0]?.length ?? 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b border-[#3e3e42] flex items-center shrink-0">
        <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide flex-1">
          Tabela {rows} × {cols}
        </span>
        <button
          onClick={() => setActiveTable(null)}
          className="text-[#555] hover:text-[#aaa] text-[18px] leading-none transition-colors"
        >×</button>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-3 py-2 border-b border-[#3e3e42] flex gap-2 shrink-0 items-center">
        <QuickBtn onClick={addRow}>+ Linha</QuickBtn>
        <QuickBtn onClick={addCol}>+ Coluna</QuickBtn>
        <div className="flex-1" />
        <button
          onClick={copyMarkdown}
          title="Copiar como Markdown"
          className="table-panel-quick-btn"
          style={{ fontSize: 11 }}
        >
          {copied ? '✓ Copiado' : '⎘ Copiar'}
        </button>
      </div>

      {/* ── Grid editor ── */}
      <div className="flex-1 overflow-auto scrollbar-thin p-3">

        {/* Column remove buttons row */}
        <div
          className="grid mb-0.5"
          style={{ gridTemplateColumns: `18px repeat(${cols}, 1fr)` }}
        >
          <div />
          {data[0]?.map((_, c) => (
            <div key={c} className="flex justify-center px-0.5">
              <button
                onClick={() => removeCol(c)}
                title="Remover coluna"
                className="table-panel-rm-col"
              >−</button>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {data.map((row, r) => (
          <div
            key={r}
            className="grid mb-1 group/row items-center"
            style={{ gridTemplateColumns: `18px repeat(${cols}, 1fr)` }}
          >
            {/* Row side control */}
            <div className="flex flex-col items-center justify-center gap-0.5 h-full">
              {r === 0 ? (
                <span className="table-panel-h-badge">H</span>
              ) : (
                <button
                  onClick={() => removeRow(r)}
                  title="Remover linha"
                  className="table-panel-rm-row opacity-0 group-hover/row:opacity-100"
                >×</button>
              )}
            </div>

            {/* Cells */}
            {row.map((cell, c) => (
              <input
                key={c}
                data-cell={`${r}-${c}`}
                value={cell}
                onFocus={() => { focusedCell.current = { r, c } }}
                onBlur={() => { focusedCell.current = null }}
                onChange={e => updateCell(r, c, e.target.value)}
                onKeyDown={e => handleCellKeyDown(e, r, c)}
                className={r === 0 ? 'table-panel-cell table-panel-cell--header' : 'table-panel-cell'}
              />
            ))}
          </div>
        ))}

        {/* Add row inline */}
        <button onClick={addRow} className="table-panel-add-row">
          + adicionar linha
        </button>
      </div>

      {/* ── Footer hint ── */}
      <div className="px-3 py-2 border-t border-[#3e3e42] shrink-0">
        <p className="table-panel-hint">
          <span className="table-panel-h-badge" style={{ display: 'inline-flex', marginRight: 4 }}>H</span>
          = cabeçalho · passe o mouse na linha para remover
        </p>
      </div>
    </div>
  )
}

function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="table-panel-quick-btn">{children}</button>
  )
}
