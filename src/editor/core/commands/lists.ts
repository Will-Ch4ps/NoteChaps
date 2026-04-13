import { wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { EditorView } from 'prosemirror-view'
import { schema } from '../schema'

export function toggleBulletList(view: EditorView) {
  const { state, dispatch } = view
  
  // Tenta desfazer a lista primeiro
  if (liftListItem(schema.nodes.list_item)(state, dispatch)) {
    view.focus()
    return
  }
  
  // Se não está em lista, cria uma
  wrapInList(schema.nodes.bullet_list)(state, dispatch)
  view.focus()
}

export function toggleOrderedList(view: EditorView) {
  const { state, dispatch } = view
  
  // Tenta desfazer a lista primeiro
  if (liftListItem(schema.nodes.list_item)(state, dispatch)) {
    view.focus()
    return
  }
  
  // Se não está em lista, cria uma
  wrapInList(schema.nodes.ordered_list)(state, dispatch)
  view.focus()
}

export function insertTaskList(view: EditorView) {
  const { tr, selection } = view.state
  const taskList = schema.nodes.task_list.create(null, [
    schema.nodes.task_item.create({ checked: false }, [
      schema.nodes.paragraph.create()
    ])
  ])
  view.dispatch(tr.replaceSelectionWith(taskList))
  view.focus()
}
