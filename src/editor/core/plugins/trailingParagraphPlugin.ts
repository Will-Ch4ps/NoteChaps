import { Plugin } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { schema } from '../schema'

function needsTrailingParagraph(nodeName: string): boolean {
  return (
    nodeName === 'code_block' ||
    nodeName === 'table' ||
    nodeName === 'image' ||
    nodeName === 'horizontal_rule'
  )
}

/**
 * Keeps a writable paragraph after non-text terminal blocks (diagram/table/etc).
 * This prevents the "stuck after mermaid" flow when users remove the blank line.
 */
export function trailingParagraphPlugin() {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null

      const lastNode = newState.doc.lastChild
      if (!lastNode) return null
      if (!needsTrailingParagraph(lastNode.type.name)) return null

      const insertPos = newState.doc.content.size
      const paragraph = schema.nodes.paragraph.create()
      let tr = newState.tr.insert(insertPos, paragraph)

      // Place cursor in the restored writable paragraph for immediate typing.
      tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
      return tr
    }
  })
}

