import { EditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { schema } from '../schema'

export function insertImage(view: EditorView, src: string, alt = '') {
  const node = schema.nodes.image.create({ src, alt })
  const { tr } = view.state
  view.dispatch(tr.replaceSelectionWith(node))
  view.focus()
}

export function insertLink(view: EditorView, href: string, title = '') {
  const { state, dispatch } = view
  const { from, to, empty } = state.selection
  
  if (empty) {
    // Se não há seleção, insere o link como texto
    const linkText = title || href
    const linkMark = schema.marks.link.create({ href, title })
    const node = schema.text(linkText, [linkMark])
    dispatch(state.tr.replaceSelectionWith(node, false))
  } else {
    // Se há seleção, aplica o link
    const linkMark = schema.marks.link.create({ href, title })
    dispatch(state.tr.addMark(from, to, linkMark))
  }
  
  view.focus()
}

export function insertTable(view: EditorView, rows = 3, cols = 3) {
  const { nodes } = schema

  const makeHeader = (label: string) => {
    const content = nodes.paragraph.create(null, schema.text(label))
    return nodes.table_header.create(null, content)
  }

  const makeCell = () => {
    // Empty paragraph — do NOT pass schema.text('') as that is invalid
    const content = nodes.paragraph.create(null)
    return nodes.table_cell.create(null, content)
  }

  const headerRow = nodes.table_row.create(
    null,
    Array.from({ length: cols }, (_, c) => makeHeader(`Col ${c + 1}`))
  )

  const bodyRows = Array.from({ length: rows - 1 }, () =>
    nodes.table_row.create(
      null,
      Array.from({ length: cols }, () => makeCell())
    )
  )

  const tableNode = nodes.table.create(null, [headerRow, ...bodyRows])
  const { tr } = view.state
  view.dispatch(tr.replaceSelectionWith(tableNode))
  view.focus()
}

export function insertDiagram(view: EditorView, diagramCode: string) {
  const node = schema.nodes.code_block.create({ language: 'mermaid' }, schema.text(diagramCode))
  let tr = view.state.tr.replaceSelectionWith(node)
  const blockStart = tr.selection.from
  const afterNode = blockStart + node.nodeSize
  const nextNode = tr.doc.nodeAt(afterNode)

  if (!nextNode || !nextNode.isTextblock) {
    tr = tr.insert(afterNode, schema.nodes.paragraph.create())
  }

  tr = tr.setSelection(TextSelection.create(tr.doc, afterNode + 1))
  tr = tr.scrollIntoView()
  view.dispatch(tr)
  view.focus()
}

export function insertHorizontalRule(view: EditorView) {
  const node = schema.nodes.horizontal_rule.create()
  const { tr } = view.state
  view.dispatch(tr.replaceSelectionWith(node))
  view.focus()
}
