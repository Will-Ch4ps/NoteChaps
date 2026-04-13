import { schema as markdownSchema } from 'prosemirror-markdown'

/**
 * Marks estendidas do schema Markdown.
 * Apenas marks com representação em Markdown/HTML são incluídas.
 * Marks puramente visuais (textColor, fontSize, fontFamily) foram removidas
 * pois não persistem em arquivos .md.
 */

export const schemaMarks = markdownSchema.spec.marks.append({
  underline: {
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration=underline' }
    ],
    toDOM() { return ['u', 0] }
  },

  strikethrough: {
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { style: 'text-decoration=line-through' }
    ],
    toDOM() { return ['s', 0] }
  },

  highlight: {
    attrs: { color: { default: '#ffff00' } },
    parseDOM: [
      {
        tag: 'mark',
        getAttrs(dom) {
          return { color: (dom as HTMLElement).style.backgroundColor || '#ffff00' }
        }
      }
    ],
    toDOM(mark) {
      return ['mark', { style: `background-color: ${mark.attrs.color}` }, 0]
    }
  }
})
