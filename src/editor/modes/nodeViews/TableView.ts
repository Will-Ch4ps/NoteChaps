import { NodeView, EditorView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'
import { schema } from '../../core/schema'
import { useEditorStore } from '../../../store/editorStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCell(isHeader: boolean, text = '') {
  const content = text
    ? schema.nodes.paragraph.create(null, schema.text(text))
    : schema.nodes.paragraph.create(null)
  return isHeader
    ? schema.nodes.table_header.create(null, content)
    : schema.nodes.table_cell.create(null, content)
}

function getTableDimensions(node: PMNode): { rows: number; cols: number } {
  const rows = node.childCount
  const cols = rows > 0 ? node.child(0).childCount : 0
  return { rows, cols }
}

function findTableBounds(view: EditorView, tablePos: number): { start: number; end: number; node: PMNode } | null {
  const doc = view.state.doc
  let found: { start: number; end: number; node: PMNode } | null = null
  doc.nodesBetween(0, doc.content.size, (n, pos) => {
    if (pos === tablePos && n.type === schema.nodes.table) {
      found = { start: pos, end: pos + n.nodeSize, node: n }
      return false
    }
    return true
  })
  return found
}

// ─── TableView ────────────────────────────────────────────────────────────────

export class TableView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private view: EditorView
  private getPos: () => number | undefined
  private node: PMNode
  private toolbar: HTMLElement

  constructor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos

    // Outer wrapper
    this.dom = document.createElement('div')
    this.dom.className = 'table-view-wrapper'

    // Toolbar
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'table-toolbar'
    this.buildToolbar()

    // The actual table (ProseMirror manages content inside)
    const tableWrap = document.createElement('div')
    tableWrap.className = 'table-scroll-wrap'

    this.contentDOM = document.createElement('table')
    this.contentDOM.className = 'md-table'

    tableWrap.appendChild(this.contentDOM)
    this.dom.appendChild(this.toolbar)
    this.dom.appendChild(tableWrap)
  }

  private buildToolbar() {
    this.toolbar.innerHTML = ''

    const { rows, cols } = getTableDimensions(this.node)

    const btn = (label: string, title: string, cls: string, action: () => void) => {
      const b = document.createElement('button')
      b.className = `table-tb-btn ${cls}`
      b.textContent = label
      b.title = title
      b.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); action() })
      return b
    }

    const sep = () => {
      const s = document.createElement('span'); s.className = 'table-tb-sep'; return s
    }

    const info = document.createElement('span')
    info.className = 'table-tb-info'
    info.textContent = `${rows} × ${cols}`

    // Copy button — needs ref to update label
    const copyBtn = document.createElement('button')
    copyBtn.className = 'table-tb-btn table-tb-edit'
    copyBtn.textContent = '⎘'
    copyBtn.title = 'Copiar tabela como Markdown'
    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation()
      this.copyAsMarkdown(copyBtn)
    })

    this.toolbar.append(
      info,
      sep(),
      btn('+L', 'Adicionar linha',       'table-tb-add',    () => this.addRow()),
      btn('−L', 'Remover última linha',   'table-tb-remove', () => this.removeRow()),
      sep(),
      btn('+C', 'Adicionar coluna',        'table-tb-add',    () => this.addCol()),
      btn('−C', 'Remover última coluna',   'table-tb-remove', () => this.removeCol()),
      sep(),
      btn('✏', 'Editar na barra lateral', 'table-tb-edit',   () => this.openPanel()),
      copyBtn,
      btn('🗑', 'Excluir tabela',          'table-tb-danger', () => this.deleteTable()),
    )
  }

  private getTableNode(): { start: number; end: number; node: PMNode } | null {
    const pos = this.getPos()
    if (pos === undefined) return null
    return findTableBounds(this.view, pos)
  }

  private addRow() {
    const info = this.getTableNode()
    if (!info) return
    const { start, node } = info
    const cols = node.child(0).childCount

    // Build new row with same col count as first row (all body cells)
    const cells = Array.from({ length: cols }, () => makeCell(false))
    const newRow = schema.nodes.table_row.create(null, cells)

    // Insert after last row
    const lastRowOffset = node.nodeSize - 1 // before closing >
    const insertPos = start + lastRowOffset

    const tr = this.view.state.tr.insert(insertPos, newRow)
    this.view.dispatch(tr)
    this.view.focus()
  }

  private removeRow() {
    const info = this.getTableNode()
    if (!info) return
    const { start, node } = info
    const rows = node.childCount
    if (rows <= 1) return // keep at least header

    // Find the last row position
    let lastRowStart = start + 1
    for (let i = 0; i < rows - 1; i++) {
      lastRowStart += node.child(i).nodeSize
    }
    const lastRow = node.child(rows - 1)
    const tr = this.view.state.tr.delete(lastRowStart, lastRowStart + lastRow.nodeSize)
    this.view.dispatch(tr)
    this.view.focus()
  }

  private addCol() {
    const info = this.getTableNode()
    if (!info) return
    const { start, node } = info

    let tr = this.view.state.tr
    let offset = start + 1 // inside table, before first row

    for (let r = 0; r < node.childCount; r++) {
      const row = node.child(r)
      // Insert position = after last cell of this row
      const rowEnd = offset + row.nodeSize - 1 // before </tr>
      const isHeader = r === 0
      const cell = makeCell(isHeader, isHeader ? `Col ${row.childCount + 1}` : '')
      tr = tr.insert(tr.mapping.map(rowEnd), cell)
      offset += row.nodeSize
    }

    this.view.dispatch(tr)
    this.view.focus()
  }

  private removeCol() {
    const info = this.getTableNode()
    if (!info) return
    const { start, node } = info
    const cols = node.child(0).childCount
    if (cols <= 1) return

    let tr = this.view.state.tr
    let rowOffset = start + 1

    for (let r = 0; r < node.childCount; r++) {
      const row = node.child(r)
      // Find last cell start within this row
      let cellStart = rowOffset + 1 // inside row
      for (let c = 0; c < row.childCount - 1; c++) {
        cellStart += row.child(c).nodeSize
      }
      const lastCell = row.child(row.childCount - 1)
      tr = tr.delete(tr.mapping.map(cellStart), tr.mapping.map(cellStart + lastCell.nodeSize))
      rowOffset += row.nodeSize
    }

    this.view.dispatch(tr)
    this.view.focus()
  }

  private deleteTable() {
    const info = this.getTableNode()
    if (!info) return
    const tr = this.view.state.tr.delete(info.start, info.end)
    this.view.dispatch(tr)
    this.view.focus()
  }

  private copyAsMarkdown(btn: HTMLButtonElement) {
    // Build markdown table string from current node
    const rows: string[][] = []
    for (let r = 0; r < this.node.childCount; r++) {
      const row = this.node.child(r)
      const cells: string[] = []
      for (let c = 0; c < row.childCount; c++) cells.push(row.child(c).textContent.trim())
      rows.push(cells)
    }
    if (!rows.length) return

    const colWidths = rows[0].map((_, ci) =>
      Math.max(...rows.map(r => (r[ci] ?? '').length), 3)
    )

    const formatRow = (cells: string[]) =>
      '| ' + cells.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |'

    const separator = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |'

    const lines = [formatRow(rows[0]), separator, ...rows.slice(1).map(formatRow)]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      const orig = btn.textContent
      btn.textContent = '✓'
      setTimeout(() => { btn.textContent = orig }, 2000)
    })
  }

  private openPanel() {
    const pos = this.getPos()
    if (pos === undefined) return
    useEditorStore.getState().setActiveTable({ node: this.node, pos })
    import('../../../store/uiStore').then(({ useUIStore }) => {
      const ui = useUIStore.getState()
      if (!ui.sidebarRightOpen) ui.toggleSidebarRight()
    })
  }

  update(node: PMNode) {
    if (node.type !== schema.nodes.table) return false
    this.node = node
    this.buildToolbar() // refresh row×col count
    return true
  }

  destroy() {
    // Clear the panel when this table's NodeView is torn down (tab switch/close)
    const store = useEditorStore.getState()
    if (store.activeTable?.pos === this.getPos()) {
      store.setActiveTable(null)
    }
  }

  stopEvent() { return false }
  ignoreMutation(mutation: MutationRecord) {
    // Allow ProseMirror to manage cell content, ignore toolbar mutations
    return this.toolbar.contains(mutation.target as Node)
  }
}
