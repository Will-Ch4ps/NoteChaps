import mermaid from 'mermaid'
import { Node as PMNode } from 'prosemirror-model'
import { EditorView, NodeView } from 'prosemirror-view'
import { schema } from '../../core/schema'
import { useEditorStore } from '../../../store/editorStore'
import { getMermaidRenderCode, isMermaidBlock } from '../../../shared/mermaid'

let mermaidInitialized = false
let diagramCounter = 0
let activeDiagramSessionCounter = 0

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function initMermaid() {
  if (mermaidInitialized) return

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    darkMode: true,
    securityLevel: 'loose',
    themeVariables: {
      primaryColor: '#2d2d2d',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#4a4a4a',
      lineColor: '#888',
      secondaryColor: '#252525',
      tertiaryColor: '#1a1a1a',
      background: '#1e1e1e',
      mainBkg: '#2d2d2d',
      nodeBorder: '#4a4a4a',
      clusterBkg: '#252525',
      edgeLabelBackground: '#2d2d2d',
      actorBkg: '#2d2d2d',
      actorBorder: '#4a9eff',
      actorTextColor: '#e0e0e0',
      activationBorderColor: '#4a9eff',
      activationBkgColor: '#1a1a1a',
      sequenceNumberColor: '#4a9eff',
      signalColor: '#aaa',
      signalTextColor: '#e0e0e0'
    },
    flowchart: {
      curve: 'basis',
      htmlLabels: true,
      useMaxWidth: false,
      padding: 18,
      nodeSpacing: 60,
      rankSpacing: 70,
      wrappingWidth: 260
    },
    sequence: {
      useMaxWidth: false,
      wrap: true,
      width: 180
    },
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 13
  })

  mermaidInitialized = true
}

export class DiagramView implements NodeView {
  dom: HTMLElement
  private view: EditorView
  private getPos: () => number | undefined
  private node: PMNode
  private renderArea: HTMLElement
  private svgContainer: HTMLElement
  private renderTimeout: ReturnType<typeof setTimeout> | null = null

  private svgZoom = 1
  private svgPan = { x: 0, y: 0 }
  private isPanning = false
  private panStart = { x: 0, y: 0 }
  private panOrigin = { x: 0, y: 0 }
  private onWindowMouseMove: ((event: MouseEvent) => void) | null = null
  private onWindowMouseUp: (() => void) | null = null
  private onDomMouseDown: ((event: MouseEvent) => void) | null = null

  constructor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos
    initMermaid()

    this.dom = document.createElement('div')
    this.dom.className = 'diagram-view'
    this.dom.setAttribute('data-diagram', 'mermaid')

    this.onDomMouseDown = (event: MouseEvent) => {
      if ((event.target as Element).closest('.diagram-btn-bar')) return
      if (event.button !== 0) return
      this.activateInSidebar(false)
    }
    this.dom.addEventListener('mousedown', this.onDomMouseDown)

    this.renderArea = document.createElement('div')
    this.renderArea.className = 'diagram-rendered'

    this.svgContainer = document.createElement('div')
    this.svgContainer.className = 'diagram-svg-container'
    this.renderArea.appendChild(this.svgContainer)

    this.renderArea.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        event.stopPropagation()
        const delta = event.deltaY < 0 ? 0.12 : -0.12
        this.svgZoom = Math.max(0.2, Math.min(6, this.svgZoom + delta))
        this.applyTransform()
      },
      { passive: false }
    )

    this.renderArea.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return
      if ((event.target as Element).closest('.diagram-btn-bar')) return
      this.isPanning = true
      this.panStart = { x: event.clientX, y: event.clientY }
      this.panOrigin = { x: this.svgPan.x, y: this.svgPan.y }
      this.renderArea.classList.add('is-panning')
      event.preventDefault()
    })

    this.onWindowMouseMove = (event: MouseEvent) => {
      if (!this.isPanning) return
      const dx = (event.clientX - this.panStart.x) / this.svgZoom
      const dy = (event.clientY - this.panStart.y) / this.svgZoom
      this.svgPan = { x: this.panOrigin.x + dx, y: this.panOrigin.y + dy }
      this.applyTransform()
    }
    window.addEventListener('mousemove', this.onWindowMouseMove)

    this.onWindowMouseUp = () => {
      if (!this.isPanning) return
      this.isPanning = false
      this.renderArea.classList.remove('is-panning')
    }
    window.addEventListener('mouseup', this.onWindowMouseUp)

    const buttonBar = document.createElement('div')
    buttonBar.className = 'diagram-btn-bar'

    const editBtn = document.createElement('button')
    editBtn.className = 'diagram-btn diagram-btn-primary'
    editBtn.textContent = 'Edit'
    editBtn.title = 'Abrir editor visual na barra lateral'
    editBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.openEditor()
    })

    const zoomOutBtn = document.createElement('button')
    zoomOutBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomOutBtn.textContent = '-'
    zoomOutBtn.title = 'Diminuir zoom'
    zoomOutBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.svgZoom = Math.max(0.2, this.svgZoom - 0.2)
      this.applyTransform()
    })

    const zoomResetBtn = document.createElement('button')
    zoomResetBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomResetBtn.title = 'Resetar zoom e posicao'
    zoomResetBtn.textContent = 'Reset'
    zoomResetBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.resetView()
    })

    const zoomInBtn = document.createElement('button')
    zoomInBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomInBtn.textContent = '+'
    zoomInBtn.title = 'Aumentar zoom'
    zoomInBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.svgZoom = Math.min(6, this.svgZoom + 0.2)
      this.applyTransform()
    })

    const copyBtn = document.createElement('button')
    copyBtn.className = 'diagram-btn'
    copyBtn.textContent = 'Copy'
    copyBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      navigator.clipboard.writeText(this.node.textContent).then(() => {
        copyBtn.textContent = 'OK'
        setTimeout(() => {
          copyBtn.textContent = 'Copy'
        }, 1800)
      })
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'diagram-btn diagram-btn-danger'
    deleteBtn.textContent = 'Del'
    deleteBtn.title = 'Excluir diagrama'
    deleteBtn.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.deleteSelf()
    })

    buttonBar.append(editBtn, zoomOutBtn, zoomResetBtn, zoomInBtn, copyBtn, deleteBtn)

    this.dom.appendChild(this.renderArea)
    this.dom.appendChild(buttonBar)

    this.renderDiagram()
  }

  private applyTransform() {
    this.svgContainer.style.transform = `scale(${this.svgZoom}) translate(${this.svgPan.x}px, ${this.svgPan.y}px)`
  }

  private resetView() {
    this.svgZoom = 1
    this.svgPan = { x: 0, y: 0 }
    this.applyTransform()
  }

  private deleteSelf() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { state, dispatch } = this.view
    const node = state.doc.nodeAt(pos)
    if (!node) return
    dispatch(state.tr.delete(pos, pos + node.nodeSize))
    this.view.focus()
  }

  private openEditor() {
    this.activateInSidebar(true)
  }

  private activateInSidebar(openSidebar: boolean) {
    const pos = this.getPos()
    if (pos === undefined) return
    const liveNode = this.view.state.doc.nodeAt(pos)
    const sourceNode = liveNode && liveNode.type === schema.nodes.code_block ? liveNode : this.node
    const lang = (sourceNode.attrs.language as string) || (sourceNode.attrs.params as string) || ''
    const renderCode = getMermaidRenderCode(lang, sourceNode.textContent)

    useEditorStore.getState().setActiveDiagram({
      code: renderCode,
      pos,
      language: lang,
      sessionId: ++activeDiagramSessionCounter
    })
    if (openSidebar) {
      import('../../../store/uiStore').then(({ useUIStore }) => {
        if (!useUIStore.getState().sidebarRightOpen) {
          useUIStore.getState().toggleSidebarRight()
        }
      })
    }
  }

  async renderDiagram() {
    this.resetView()
    const lang = (this.node.attrs.language as string) || (this.node.attrs.params as string) || ''
    const code = getMermaidRenderCode(lang, this.node.textContent).trim()

    if (!code) {
      this.svgContainer.innerHTML = '<div class="diagram-empty">Diagrama vazio - clique em Edit</div>'
      return
    }

    this.svgContainer.innerHTML = '<div class="diagram-loading">Renderizando...</div>'

    try {
      const id = `mermaid-diagram-${++diagramCounter}`
      const { svg } = await mermaid.render(id, code)
      this.svgContainer.innerHTML = svg

      const svgEl = this.svgContainer.querySelector('svg') as SVGSVGElement | null
      if (svgEl) {
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.maxWidth = '100%'
        svgEl.style.height = 'auto'
        svgEl.style.display = 'block'
        svgEl.querySelectorAll('foreignObject div').forEach((el) => {
          const html = el as HTMLElement
          html.style.whiteSpace = 'normal'
          html.style.wordBreak = 'break-word'
        })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.svgContainer.innerHTML = `<div class="diagram-error"><strong>Erro no diagrama</strong><pre>${escapeHtml(msg)}</pre></div>`
    }
  }

  update(node: PMNode) {
    if (node.type !== schema.nodes.code_block) return false
    const lang = (node.attrs.language as string) || (node.attrs.params as string) || ''
    if (!isMermaidBlock(lang, node.textContent)) return false

    this.node = node
    if (this.renderTimeout) clearTimeout(this.renderTimeout)
    this.renderTimeout = setTimeout(() => this.renderDiagram(), 100)
    return true
  }

  stopEvent() {
    return false
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    if (this.renderTimeout) clearTimeout(this.renderTimeout)
    if (this.onWindowMouseMove) {
      window.removeEventListener('mousemove', this.onWindowMouseMove)
      this.onWindowMouseMove = null
    }
    if (this.onWindowMouseUp) {
      window.removeEventListener('mouseup', this.onWindowMouseUp)
      this.onWindowMouseUp = null
    }
    if (this.onDomMouseDown) {
      this.dom.removeEventListener('mousedown', this.onDomMouseDown)
      this.onDomMouseDown = null
    }

    const active = useEditorStore.getState().activeDiagram
    const pos = this.getPos()
    if (active && pos !== undefined && active.pos === pos) {
      useEditorStore.getState().setActiveDiagram(null)
    }
  }
}
