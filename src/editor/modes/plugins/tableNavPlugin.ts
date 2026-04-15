import { Plugin, TextSelection, Transaction, EditorState } from 'prosemirror-state'
import { Node as PMNode, ResolvedPos } from 'prosemirror-model'
import { schema } from '../../core/schema'

/**
 * In-document table keyboard navigation:
 * - Tab           → próxima célula (próxima linha se fim da linha)
 * - Shift-Tab     → célula anterior
 * - Enter         → célula da linha abaixo na mesma coluna (sai embaixo se última linha)
 * - ArrowUp/Down  → linha acima/abaixo na mesma coluna (sai acima/abaixo se fronteira)
 * - ArrowLeft/Right → somente navega para célula adjacente quando o cursor está
 *                     no início/fim do texto da célula
 * - Escape        → sai da tabela (insere parágrafo vazio logo abaixo)
 *
 * NENHUMA ação cria linhas/colunas automaticamente — isso é feito via toolbar da tabela.
 */

type CellInfo = {
  tablePos: number
  table: PMNode
  rowIndex: number
  colIndex: number
  cellStart: number
  cellEnd: number
}

function findCellAt($pos: ResolvedPos): CellInfo | null {
  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d)
    if (node.type === schema.nodes.table_cell || node.type === schema.nodes.table_header) {
      const cellStart = $pos.before(d)
      const cellEnd = cellStart + node.nodeSize
      const rowIndexInTable = $pos.index(d - 2)
      const colIndex = $pos.index(d - 1)
      const table = $pos.node(d - 2)
      const tablePos = $pos.before(d - 2)
      if (!table || table.type !== schema.nodes.table) return null
      if (rowIndexInTable < 0 || rowIndexInTable >= table.childCount) return null
      return { tablePos, table, rowIndex: rowIndexInTable, colIndex, cellStart, cellEnd }
    }
  }
  return null
}

function cellRange(table: PMNode, tablePos: number, rowIdx: number, colIdx: number): { start: number; end: number } | null {
  if (rowIdx < 0 || rowIdx >= table.childCount) return null
  const row = table.child(rowIdx)
  if (colIdx < 0 || colIdx >= row.childCount) return null

  let offset = tablePos + 1 // enter table
  for (let r = 0; r < rowIdx; r++) offset += table.child(r).nodeSize
  offset += 1 // enter row
  for (let c = 0; c < colIdx; c++) offset += row.child(c).nodeSize
  const cell = row.child(colIdx)
  return { start: offset, end: offset + cell.nodeSize }
}

function selectInsideCell(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, start: number, end: number, atEnd = false): boolean {
  const inside = atEnd ? end - 2 : start + 2 // inside the cell's paragraph
  const safePos = Math.max(start + 1, Math.min(end - 1, inside))
  if (dispatch) {
    const tr = state.tr.setSelection(TextSelection.create(state.doc, safePos))
    tr.scrollIntoView()
    dispatch(tr)
  }
  return true
}

function exitBelow(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, tablePos: number, table: PMNode): boolean {
  const afterTable = tablePos + table.nodeSize
  const { doc } = state
  const nodeAfter = doc.nodeAt(afterTable)

  if (dispatch) {
    let tr = state.tr
    if (!nodeAfter || !nodeAfter.isTextblock) {
      const para = schema.nodes.paragraph.create()
      tr = tr.insert(afterTable, para)
      tr = tr.setSelection(TextSelection.create(tr.doc, afterTable + 1))
    } else {
      tr = tr.setSelection(TextSelection.create(doc, afterTable + 1))
    }
    tr.scrollIntoView()
    dispatch(tr)
  }
  return true
}

function exitAbove(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, tablePos: number): boolean {
  const { doc } = state
  if (tablePos === 0) {
    // Insert a paragraph at the very top
    if (dispatch) {
      const para = schema.nodes.paragraph.create()
      const tr = state.tr.insert(0, para).setSelection(TextSelection.create(state.doc.resolve(0).doc, 1))
      tr.scrollIntoView()
      dispatch(tr)
    }
    return true
  }
  const $before = doc.resolve(tablePos)
  const posBefore = $before.pos - 1
  if (posBefore < 0) return false
  if (dispatch) {
    const tr = state.tr.setSelection(TextSelection.create(doc, posBefore))
    tr.scrollIntoView()
    dispatch(tr)
  }
  return true
}

export function tableNavPlugin(): Plugin {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        const { state } = view
        const { $from, empty } = state.selection
        const info = findCellAt($from)
        if (!info) return false

        const { table, tablePos, rowIndex, colIndex } = info
        const row = table.child(rowIndex)
        const colCount = row.childCount
        const rowCount = table.childCount
        const dispatch = view.dispatch.bind(view)

        // ─── Tab ──────────────────────────────────────────────────────────
        if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          if (event.shiftKey) {
            // Previous cell
            let r = rowIndex
            let c = colIndex - 1
            if (c < 0) { r -= 1; c = table.child(Math.max(0, r)).childCount - 1 }
            if (r < 0) return true
            const range = cellRange(table, tablePos, r, c)
            if (!range) return true
            selectInsideCell(state, dispatch, range.start, range.end, true)
            return true
          } else {
            // Next cell
            let r = rowIndex
            let c = colIndex + 1
            if (c >= colCount) { r += 1; c = 0 }
            if (r >= rowCount) {
              // End of table — exit below
              return exitBelow(state, dispatch, tablePos, table)
            }
            const range = cellRange(table, tablePos, r, c)
            if (!range) return true
            selectInsideCell(state, dispatch, range.start, range.end)
            return true
          }
        }

        // ─── Enter (sem shift) ───────────────────────────────────────────
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          const nextRow = rowIndex + 1
          if (nextRow >= rowCount) {
            return exitBelow(state, dispatch, tablePos, table)
          }
          // Clamp col index to new row size
          const targetRow = table.child(nextRow)
          const targetCol = Math.min(colIndex, targetRow.childCount - 1)
          const range = cellRange(table, tablePos, nextRow, targetCol)
          if (!range) return true
          selectInsideCell(state, dispatch, range.start, range.end)
          return true
        }

        // ─── Arrow Up ────────────────────────────────────────────────────
        if (event.key === 'ArrowUp' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const prevRow = rowIndex - 1
          if (prevRow < 0) {
            event.preventDefault()
            return exitAbove(state, dispatch, tablePos)
          }
          const targetRow = table.child(prevRow)
          const targetCol = Math.min(colIndex, targetRow.childCount - 1)
          const range = cellRange(table, tablePos, prevRow, targetCol)
          if (!range) return false
          event.preventDefault()
          selectInsideCell(state, dispatch, range.start, range.end, true)
          return true
        }

        // ─── Arrow Down ──────────────────────────────────────────────────
        if (event.key === 'ArrowDown' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const nextRow = rowIndex + 1
          if (nextRow >= rowCount) {
            event.preventDefault()
            return exitBelow(state, dispatch, tablePos, table)
          }
          const targetRow = table.child(nextRow)
          const targetCol = Math.min(colIndex, targetRow.childCount - 1)
          const range = cellRange(table, tablePos, nextRow, targetCol)
          if (!range) return false
          event.preventDefault()
          selectInsideCell(state, dispatch, range.start, range.end)
          return true
        }

        // ─── Arrow Left (apenas na borda esquerda do texto) ─────────────
        if (event.key === 'ArrowLeft' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && empty) {
          const atCellStart = $from.pos === info.cellStart + 2
          if (atCellStart) {
            let r = rowIndex
            let c = colIndex - 1
            if (c < 0) { r -= 1; c = r >= 0 ? table.child(r).childCount - 1 : -1 }
            if (r < 0 || c < 0) return false
            const range = cellRange(table, tablePos, r, c)
            if (!range) return false
            event.preventDefault()
            selectInsideCell(state, dispatch, range.start, range.end, true)
            return true
          }
        }

        // ─── Arrow Right (apenas na borda direita do texto) ─────────────
        if (event.key === 'ArrowRight' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && empty) {
          const atCellEnd = $from.pos === info.cellEnd - 2
          if (atCellEnd) {
            let r = rowIndex
            let c = colIndex + 1
            if (c >= colCount) { r += 1; c = 0 }
            if (r >= rowCount) {
              event.preventDefault()
              return exitBelow(state, dispatch, tablePos, table)
            }
            const range = cellRange(table, tablePos, r, c)
            if (!range) return false
            event.preventDefault()
            selectInsideCell(state, dispatch, range.start, range.end)
            return true
          }
        }

        // ─── Escape ──────────────────────────────────────────────────────
        if (event.key === 'Escape') {
          event.preventDefault()
          return exitBelow(state, dispatch, tablePos, table)
        }

        return false
      },
    },
  })
}
