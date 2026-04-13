import { NodeView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'
import { schema } from '../../core/schema'

export class CodeBlockView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private copyBtn: HTMLButtonElement

  constructor(_node: PMNode) {
    this.dom = document.createElement('div')
    this.dom.className = 'code-block-wrapper'

    const pre = document.createElement('pre')
    pre.style.margin = '0'

    const code = document.createElement('code')
    pre.appendChild(code)
    this.contentDOM = code

    this.copyBtn = document.createElement('button')
    this.copyBtn.className = 'code-copy-btn'
    this.copyBtn.textContent = 'Copiar'
    this.copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.handleCopy()
    })

    this.dom.appendChild(pre)
    this.dom.appendChild(this.copyBtn)
  }

  private handleCopy() {
    const text = this.contentDOM.textContent ?? ''
    const btn = this.copyBtn

    const markCopied = () => {
      btn.textContent = 'Copiado!'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = 'Copiar'
        btn.classList.remove('copied')
      }, 2000)
    }

    navigator.clipboard.writeText(text).then(markCopied).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      markCopied()
    })
  }

  update(node: PMNode) {
    return node.type === schema.nodes.code_block
  }

  stopEvent(event: Event) {
    return event.target === this.copyBtn
  }

  ignoreMutation() { return false }
}
