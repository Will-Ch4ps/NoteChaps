import { schema as markdownSchema } from 'prosemirror-markdown'
import { addListNodes } from 'prosemirror-schema-list'
import { isMermaidBlock } from '../../../shared/mermaid'
import { parseDiagramLayoutMeta } from '../../../shared/diagramLayout'

/**
 * Nodes estendidos do schema Markdown.
 *
 * TASK LIST — Estratégia de parse:
 * O MarkdownConverter.toDoc() usa markdown-it para gerar HTML e injeta
 * data-type="task_item" e data-checked="true/false" nos <li>.
 * O parseDOM abaixo lê esses atributos para criar os nodes corretos.
 */

export const schemaNodes = addListNodes(markdownSchema.spec.nodes, 'paragraph block*', 'block')
  .append({

    // ─── task_item ───────────────────────────────────────────────────────
    task_item: {
      attrs: { checked: { default: false } },
      content: 'paragraph block*',
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: 'li[data-type="task_item"]',
          priority: 60,
          getAttrs(dom) {
            const el = dom as HTMLElement
            const checkedAttr = el.getAttribute('data-checked')
            const inputChecked = (el.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked
            return {
              checked: checkedAttr === 'true' || inputChecked === true
            }
          }
        },
        {
          tag: 'li.task-list-item',
          getAttrs(dom) {
            const el = dom as HTMLElement
            const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null
            return { checked: input?.checked === true || input?.hasAttribute('checked') === true }
          }
        }
      ],
      toDOM(node) {
        const checked = node.attrs.checked as boolean
        return [
          'li',
          {
            'data-type': 'task_item',
            'data-checked': checked ? 'true' : 'false',
            class: `task-item${checked ? ' task-item--checked' : ''}`
          },
          [
            'span',
            { class: 'task-checkbox-wrap', contenteditable: 'false' },
            [
              'input',
              {
                type: 'checkbox',
                class: 'task-checkbox',
                ...(checked ? { checked: '' } : {})
              }
            ]
          ],
          ['span', { class: 'task-content' }, 0]
        ]
      }
    },

    // ─── task_list ───────────────────────────────────────────────────────
    task_list: {
      group: 'block',
      content: 'task_item+',
      parseDOM: [
        { tag: 'ul[data-type="task_list"]', priority: 60 },
        { tag: 'ul.task-list', priority: 60 },
        { tag: 'ul.contains-task-list', priority: 60 }
      ],
      toDOM() {
        return ['ul', { 'data-type': 'task_list', class: 'task-list' }, 0]
      }
    },

    // ─── wiki_link (inline, editável como texto normal) ──────────────────
    wiki_link: {
      group: 'inline',
      inline: true,
      content: 'text*',
      attrs: {
        target: { default: '' },
        label: { default: '' }
      },
      parseDOM: [
        {
          tag: 'span[data-wiki-link]',
          getAttrs(dom) {
            const el = dom as HTMLElement
            return {
              target: el.getAttribute('data-wiki-link') ?? '',
              label: el.getAttribute('data-wiki-label') ?? el.textContent ?? ''
            }
          }
        }
      ],
      toDOM(node) {
        return [
          'span',
          {
            'data-wiki-link': node.attrs.target as string,
            'data-wiki-label': node.attrs.label as string,
            class: 'wiki-link',
            title: `Ctrl+Clique para abrir: ${node.attrs.target as string}`
          },
          0
        ]
      }
    },

    // ─── table ───────────────────────────────────────────────────────────
    table: {
      group: 'block',
      content: 'table_row+',
      tableRole: 'table',
      isolating: true,
      parseDOM: [{ tag: 'table' }],
      toDOM() { return ['table', { class: 'md-table' }, ['tbody', 0]] }
    },

    table_row: {
      content: '(table_cell | table_header)*',
      tableRole: 'row',
      parseDOM: [{ tag: 'tr' }],
      toDOM() { return ['tr', 0] }
    },

    table_cell: {
      content: 'inline*',
      attrs: {
        align: { default: null },
        colspan: { default: 1 },
        rowspan: { default: 1 }
      },
      tableRole: 'cell',
      isolating: true,
      parseDOM: [{
        tag: 'td',
        getAttrs(dom) {
          const el = dom as HTMLElement
          return {
            align: el.getAttribute('align') || el.style.textAlign || null,
            colspan: el.getAttribute('colspan') ? Number(el.getAttribute('colspan')) : 1,
            rowspan: el.getAttribute('rowspan') ? Number(el.getAttribute('rowspan')) : 1
          }
        }
      }],
      toDOM(node) {
        const { align, colspan, rowspan } = node.attrs
        const attrs: Record<string, string> = {}
        if (align) attrs.align = align as string
        if (colspan !== 1) attrs.colspan = String(colspan)
        if (rowspan !== 1) attrs.rowspan = String(rowspan)
        return ['td', attrs, 0]
      }
    },

    table_header: {
      content: 'inline*',
      attrs: {
        align: { default: null },
        colspan: { default: 1 },
        rowspan: { default: 1 }
      },
      tableRole: 'header_cell',
      isolating: true,
      parseDOM: [{
        tag: 'th',
        getAttrs(dom) {
          const el = dom as HTMLElement
          return {
            align: el.getAttribute('align') || el.style.textAlign || null,
            colspan: el.getAttribute('colspan') ? Number(el.getAttribute('colspan')) : 1,
            rowspan: el.getAttribute('rowspan') ? Number(el.getAttribute('rowspan')) : 1
          }
        }
      }],
      toDOM(node) {
        const { align, colspan, rowspan } = node.attrs
        const attrs: Record<string, string> = {}
        if (align) attrs.align = align as string
        if (colspan !== 1) attrs.colspan = String(colspan)
        if (rowspan !== 1) attrs.rowspan = String(rowspan)
        return ['th', attrs, 0]
      }
    },

    // ─── code_block (sobrescreve o padrão para suportar attr language) ──────
    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      draggable: true,
      marks: '',
      attrs: {
        params: { default: '' },
        language: { default: '' },
        diagramWidth: { default: null },
        diagramHeight: { default: null }
      },
      parseDOM: [{
        tag: 'pre',
        preserveWhitespace: 'full' as const,
        getAttrs(dom) {
          const el = dom as HTMLElement
          const code = el.querySelector('code')
          const lang = code?.getAttribute('data-language') || code?.className?.replace('language-', '') || ''
          const content = code?.textContent ?? ''
          const layout = parseDiagramLayoutMeta(content)
          const mermaid = isMermaidBlock(lang, content)
          return {
            params: lang,
            language: lang,
            diagramWidth: mermaid ? (layout.width ?? null) : null,
            diagramHeight: mermaid ? (layout.height ?? null) : null
          }
        }
      }],
      toDOM(node) {
        const lang = (node.attrs.language as string) || (node.attrs.params as string) || ''
        const codeAttrs: Record<string, string> = {}
        if (lang) {
          codeAttrs['data-language'] = lang
          codeAttrs.class = `language-${lang}`
        }
        if (typeof node.attrs.diagramWidth === 'number') {
          codeAttrs['data-diagram-width'] = String(node.attrs.diagramWidth)
        }
        if (typeof node.attrs.diagramHeight === 'number') {
          codeAttrs['data-diagram-height'] = String(node.attrs.diagramHeight)
        }
        return ['pre', ['code', codeAttrs, 0]]
      }
    },

    /**
     * BUG FIX: Image node with resize support
     * 
     * PROBLEMA: O schema padrão não suporta width/height, então
     * o redimensionamento via menu de contexto não funcionava.
     * 
     * SOLUÇÃO: Extende o node image com attrs width/height e
     * renderiza via style inline para controle preciso.
     */
    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        width: { default: null },
        height: { default: null }
      },
      group: 'inline',
      draggable: true,
      parseDOM: [{
        tag: 'img[src]',
        getAttrs(dom) {
          const el = dom as HTMLElement
          return {
            src: el.getAttribute('src'),
            title: el.getAttribute('title'),
            alt: el.getAttribute('alt'),
            width: el.getAttribute('width') ? parseInt(el.getAttribute('width')!) : null,
            height: el.getAttribute('height') ? parseInt(el.getAttribute('height')!) : null
          }
        }
      }],
      toDOM(node) {
        const { src, alt, title, width, height } = node.attrs
        const attrs: Record<string, string> = { src }
        if (alt) attrs.alt = alt
        if (title) attrs.title = title
        
        // Aplica dimensões via style para controle preciso
        const styles: string[] = []
        if (width) {
          attrs.width = String(width)
          styles.push(`width: ${width}px`)
        }
        if (height) {
          attrs.height = String(height)
          styles.push(`height: ${height}px`)
        }
        if (styles.length > 0) {
          attrs.style = styles.join('; ')
        }
        
        return ['img', attrs]
      }
    }
  })
