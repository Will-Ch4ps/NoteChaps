import { toggleMark, setBlockType } from 'prosemirror-commands'
import { EditorView } from 'prosemirror-view'
import { schema } from '../schema'

export function applyMark(view: EditorView, markName: string, attrs?: Record<string, unknown>) {
  const markType = schema.marks[markName]
  if (!markType) return
  toggleMark(markType, attrs)(view.state, view.dispatch)
  view.focus()
}

export function setHeading(view: EditorView, level: number) {
  setBlockType(schema.nodes.heading, { level })(view.state, view.dispatch)
  view.focus()
}

export function setParagraph(view: EditorView) {
  setBlockType(schema.nodes.paragraph)(view.state, view.dispatch)
  view.focus()
}

export function isMarkActive(view: EditorView, markName: string): boolean {
  const markType = schema.marks[markName]
  if (!markType) return false
  const { from, $from, to, empty } = view.state.selection
  if (empty) return !!markType.isInSet(view.state.storedMarks || $from.marks())
  return view.state.doc.rangeHasMark(from, to, markType)
}

export function getActiveHeadingLevel(view: EditorView): number | null {
  const { $from } = view.state.selection
  const node = $from.node()
  if (node.type === schema.nodes.heading) return node.attrs.level as number
  return null
}
