import { keymap } from 'prosemirror-keymap'
import {
  toggleMark,
  setBlockType,
  wrapIn,
  chainCommands,
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
  deleteSelection,
  joinBackward,
  selectNodeBackward,
  joinForward,
  selectNodeForward
} from 'prosemirror-commands'
import {
  splitListItem,
  liftListItem,
  sinkListItem
} from 'prosemirror-schema-list'
import { undo, redo } from 'prosemirror-history'
import { NodeSelection, TextSelection } from 'prosemirror-state'
import { schema } from '../schema'

/**
 * BUG FIX CRÍTICO: Enter e Backspace agora funcionam naturalmente
 * sem precisar "ir para a linha antes de apagar"
 *
 * BUG FIX: Delete key agora usa joinForward/selectNodeForward nativos
 * do ProseMirror em vez de manipulação manual de posição que crasheava
 * no final do documento (RangeError: Position X out of range).
 */
export function buildKeymap() {
  const keys: Record<string, ReturnType<typeof toggleMark>> = {}

  const bind = (key: string, cmd: typeof keys[string]) => {
    keys[key] = cmd
  }

  // History
  bind('Mod-z', undo)
  bind('Shift-Mod-z', redo)
  bind('Mod-y', redo) // Windows alternative

  // Marks
  bind('Mod-b', toggleMark(schema.marks.strong))
  bind('Mod-i', toggleMark(schema.marks.em))
  bind('Mod-u', toggleMark(schema.marks.underline))

  // Headings
  bind('Shift-Ctrl-1', setBlockType(schema.nodes.heading, { level: 1 }))
  bind('Shift-Ctrl-2', setBlockType(schema.nodes.heading, { level: 2 }))
  bind('Shift-Ctrl-3', setBlockType(schema.nodes.heading, { level: 3 }))
  bind('Shift-Ctrl-4', setBlockType(schema.nodes.heading, { level: 4 }))
  bind('Shift-Ctrl-0', setBlockType(schema.nodes.paragraph))

  // Code block
  bind('Shift-Ctrl-\\', setBlockType(schema.nodes.code_block))

  // Blockquote
  bind('Ctrl->', wrapIn(schema.nodes.blockquote))

  // Lists
  bind('Mod-[', liftListItem(schema.nodes.list_item))
  bind('Mod-]', sinkListItem(schema.nodes.list_item))
  bind('Tab', sinkListItem(schema.nodes.list_item))
  bind('Shift-Tab', liftListItem(schema.nodes.list_item))

  const insertParagraphAfterSelectedBlock: typeof keys[string] = (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) return false
    const selected = state.selection.node
    const isTable = selected.type === schema.nodes.table
    const isCodeBlock = selected.type === schema.nodes.code_block
    if (!isTable && !isCodeBlock) return false

    const insertPos = state.selection.from + selected.nodeSize
    const paragraph = schema.nodes.paragraph.create()
    let tr = state.tr.insert(insertPos, paragraph)
    tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
    tr = tr.scrollIntoView()

    if (dispatch) dispatch(tr)
    return true
  }

  /**
   * BUG FIX: Enter agora funciona naturalmente em todos os contextos
   */
  bind(
    'Enter',
    chainCommands(
      insertParagraphAfterSelectedBlock,
      splitListItem(schema.nodes.list_item),
      splitListItem(schema.nodes.task_item),
      newlineInCode,
      createParagraphNear,
      liftEmptyBlock,
      splitBlock
    )
  )

  /**
   * BUG FIX: Backspace agora funciona naturalmente sem precisar navegar antes
   * Comportamento esperado:
   * - Em linha vazia: junta com anterior
   * - Com seleção: deleta seleção
   * - No início de bloco: junta com anterior
   * - No meio de texto: deleta caractere anterior
   */
  bind(
    'Backspace',
    chainCommands(
      deleteSelection,
      joinBackward,
      selectNodeBackward
    )
  )

  /**
   * BUG FIX: Delete agora usa comandos nativos do ProseMirror (joinForward,
   * selectNodeForward) que fazem bounds checking internamente.
   *
   * ANTES: Manipulação manual de $cursor.pos + 1 causava RangeError quando
   * o cursor estava no final do documento.
   *
   * DEPOIS: chainCommands com funções oficiais do ProseMirror que tratam
   * todos os edge cases (fim do doc, nós atômicos, seleções).
   */
  bind(
    'Delete',
    chainCommands(
      deleteSelection,
      joinForward,
      selectNodeForward
    )
  )

  // Shift+Enter: quebra de linha sem criar novo parágrafo
  bind('Shift-Enter', (state, dispatch) => {
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()))
    }
    return true
  })

  return keymap(keys)
}
