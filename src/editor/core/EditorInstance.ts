import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history } from 'prosemirror-history'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { Node } from 'prosemirror-model'
import { schema } from './schema'
import { buildKeymap } from './plugins/keymap'
import { buildInputRules } from './plugins/inputRules'
import { placeholderPlugin } from './plugins/placeholder'
import { createSlashCommandPlugin } from '../modes/plugins/slashCommandPlugin'
import { findPlugin } from '../modes/plugins/findPlugin'
import { tableNavPlugin } from '../modes/plugins/tableNavPlugin'

export function createEditorState(doc?: Node): EditorState {
  return EditorState.create({
    schema,
    doc,
    plugins: [
      tableNavPlugin(),
      buildInputRules(),
      buildKeymap(),
      history(),
      dropCursor(),
      gapCursor(),
      placeholderPlugin(),
      createSlashCommandPlugin(),
      findPlugin
    ]
  })
}

export function createEditorView(
  container: HTMLElement,
  state: EditorState,
  onUpdate: (state: EditorState, docChanged: boolean) => void
): EditorView {
  return new EditorView(container, {
    state,
    dispatchTransaction(transaction) {
      const newState = this.state.apply(transaction)
      this.updateState(newState)
      onUpdate(newState, transaction.docChanged)
    }
  })
}
