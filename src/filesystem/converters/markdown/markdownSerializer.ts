import {
  MarkdownSerializer,
  MarkdownSerializerState,
  defaultMarkdownSerializer
} from 'prosemirror-markdown'
import { Node } from 'prosemirror-model'
import { isMermaidBlock } from '../../../shared/mermaid'
import {
  DEFAULT_DIAGRAM_LAYOUT,
  buildDiagramLayoutMeta,
  clampDiagramHeight,
  clampDiagramWidth,
  stripDiagramLayoutMeta
} from '../../../shared/diagramLayout'

const defaultNodes = defaultMarkdownSerializer.nodes
const defaultMarks = defaultMarkdownSerializer.marks

const customNodes: Record<
  string,
  (state: MarkdownSerializerState, node: Node, parent: Node, index: number) => void
> = {
  ...defaultNodes,

  /**
   * code_block: remove o trailing \n do conteúdo antes de serializar.
   * O defaultMarkdownSerializer adiciona ensureNewLine() que acumula
   * um \n extra a cada round-trip Visual→Raw→Visual.
   */
  code_block(state, node) {
    const params = (node.attrs.language as string) || (node.attrs.params as string) || ''
    state.write('```' + params + '\n')
    // Strip trailing newline para evitar linha extra acumulativa
    let content = node.textContent.replace(/\n$/, '')

    if (isMermaidBlock(params, content)) {
      const clean = stripDiagramLayoutMeta(content)
      const width = clampDiagramWidth(node.attrs.diagramWidth)
      const height = clampDiagramHeight(node.attrs.diagramHeight)
      const hasCustomLayout = width !== DEFAULT_DIAGRAM_LAYOUT.width || height !== DEFAULT_DIAGRAM_LAYOUT.height
      content = hasCustomLayout ? `${buildDiagramLayoutMeta({ width, height })}\n${clean}` : clean
    }

    state.text(content, false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },

  task_list(state, node) {
    node.forEach((child, _, i) => state.render(child, node, i))
  },

  /**
   * task_item → "- [ ] texto\n" ou "- [x] texto\n"
   *
   * Usa renderInline para evitar listas "loose" (com linha em branco extra)
   * que causariam o round-trip de volta como bullet list normal.
   */
  task_item(state, node) {
    const checked = node.attrs.checked ? '[x]' : '[ ]'
    state.write(`- ${checked} `)
    const firstChild = node.firstChild
    if (firstChild) {
      if (firstChild.type.name === 'paragraph') {
        state.renderInline(firstChild)
      } else {
        state.write(firstChild.textContent)
      }
    }
    state.write('\n')
  },

  wiki_link(state, node) {
    // Usa o texto do nó como fonte canônica (editável pelo usuário)
    // O texto já está no formato [[target]], então escreve diretamente
    const text = node.textContent
    state.write(text || `[[${(node.attrs.label as string) || (node.attrs.target as string)}]]`)
  },

  // ─── Tabelas MD ──────────────────────────────────────────────────────────
  table(state, node) {
    const rows: Node[] = []
    node.forEach(row => rows.push(row))
    if (rows.length === 0) return

    // Coleta larguras máximas por coluna para alinhamento visual
    const colWidths: number[] = []

    const getCellText = (cell: Node): string => {
      let text = ''
      cell.forEach(child => { text += child.textContent })
      return text.trim() || ' '
    }

    rows.forEach(row => {
      let col = 0
      row.forEach(cell => {
        const text = getCellText(cell)
        if (colWidths[col] === undefined || text.length > colWidths[col]) {
          colWidths[col] = Math.max(text.length, 3)
        }
        col++
      })
    })

    const pad = (text: string, width: number) => text + ' '.repeat(Math.max(0, width - text.length))

    rows.forEach((row, rowIdx) => {
      let line = '|'
      let col = 0
      row.forEach(cell => {
        const text = getCellText(cell)
        line += ` ${pad(text, colWidths[col])} |`
        col++
      })
      state.write(line + '\n')

      // Linha separadora após o cabeçalho (primeiro row)
      if (rowIdx === 0) {
        let sep = '|'
        colWidths.forEach((w, i) => {
          const align = rows[0]?.child(i)?.attrs?.align as string | null
          if (align === 'center') sep += ` :${'-'.repeat(Math.max(1, w - 2))}: |`
          else if (align === 'right') sep += ` ${'-'.repeat(Math.max(1, w - 1))}: |`
          else sep += ` ${'-'.repeat(w)} |`
        })
        state.write(sep + '\n')
      }
    })

    state.closeBlock(node)
  },

  table_row(_state, _node) { /* handled by table */ },
  table_cell(_state, _node) { /* handled by table */ },
  table_header(_state, _node) { /* handled by table */ }
}

const customMarks: Record<string, any> = {
  ...defaultMarks,

  underline: {
    open: '<u>',
    close: '</u>',
    mixable: true,
    expelEnclosingWhitespace: true
  },

  strikethrough: {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: true
  },

  highlight: {
    open: '==',
    close: '==',
    mixable: true,
    expelEnclosingWhitespace: true
  }
}

export const serializer = new MarkdownSerializer(customNodes, customMarks)
