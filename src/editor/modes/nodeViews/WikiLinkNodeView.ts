import { NodeView, EditorView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'

/**
 * Novo NodeView do WikiLink com ContentDOM.
 * Ele permite que o ProseMirror trate o interior do Link como um texto editável normal.
 * Você pode usar as setas, apagar e digitar sem criar caixas esquisitas.
 */
export class WikiLinkNodeView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement

  constructor(
    node: PMNode,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    private readonly onNavigate: (target: string) => void
  ) {
    this.dom = document.createElement('span')
    this.dom.className = 'wiki-link'
    this.dom.title = `Ctrl+Clique para abrir o link`

    // O contentDOM informa ao ProseMirror: "O texto editável vai aqui dentro!"
    this.contentDOM = document.createElement('span')
    this.dom.appendChild(this.contentDOM)

    this.dom.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        // O alvo agora é extraído do próprio texto dinâmico na hora do clique
        const text = this.contentDOM.textContent || ''
        const target = text.replace(/^\[\[/, '').replace(/\]\]$/, '')
        if (target.trim()) {
          onNavigate(target)
        }
      }
    })
  }

  // Retornar falso garante que o ProseMirror vai gerenciar e aceitar qualquer 
  // mudança de texto que você fizer no interior dos colchetes.
  ignoreMutation() { return false }
}