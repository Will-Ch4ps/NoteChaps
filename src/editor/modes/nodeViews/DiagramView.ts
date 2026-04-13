import { NodeView, EditorView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'
import { schema } from '../../core/schema'
import mermaid from 'mermaid'
import { useEditorStore } from '../../../store/editorStore'

let mermaidInitialized = false

export function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    darkMode: true,
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
      signalTextColor: '#e0e0e0',
    },
    flowchart: { curve: 'basis' },
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 13,
  })
  mermaidInitialized = true
}

let diagramCounter = 0

export class DiagramView implements NodeView {
  dom: HTMLElement
  private view: EditorView
  private getPos: () => number | undefined
  private node: PMNode
  private renderArea: HTMLElement   // overflow: hidden wrapper
  private svgContainer: HTMLElement // the element we transform
  private renderTimeout: ReturnType<typeof setTimeout> | null = null

  // Zoom / pan state
  private svgZoom = 1
  private svgPan = { x: 0, y: 0 }
  private isPanning = false
  private panStart = { x: 0, y: 0 }
  private panOrigin = { x: 0, y: 0 }

  constructor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos

    initMermaid()

    // Root container
    this.dom = document.createElement('div')
    this.dom.className = 'diagram-view'
    this.dom.setAttribute('data-diagram', 'mermaid')

    // Overflow-hidden wrapper (the "viewport" for pan/zoom)
    this.renderArea = document.createElement('div')
    this.renderArea.className = 'diagram-rendered'

    // The transformable SVG container
    this.svgContainer = document.createElement('div')
    this.svgContainer.className = 'diagram-svg-container'
    this.renderArea.appendChild(this.svgContainer)

    // ── Wheel zoom ─────────────────────────────────────────────────────────
    this.renderArea.addEventListener('wheel', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? 0.12 : -0.12
      this.svgZoom = Math.max(0.2, Math.min(6, this.svgZoom + delta))
      this.applyTransform()
    }, { passive: false })

    // ── Mouse pan ──────────────────────────────────────────────────────────
    this.renderArea.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      // Don't start pan if clicking a button inside
      if ((e.target as Element).closest('.diagram-btn-bar')) return
      this.isPanning = true
      this.panStart = { x: e.clientX, y: e.clientY }
      this.panOrigin = { x: this.svgPan.x, y: this.svgPan.y }
      this.renderArea.classList.add('is-panning')
      e.preventDefault()
    })

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return
      const dx = (e.clientX - this.panStart.x) / this.svgZoom
      const dy = (e.clientY - this.panStart.y) / this.svgZoom
      this.svgPan = { x: this.panOrigin.x + dx, y: this.panOrigin.y + dy }
      this.applyTransform()
    })

    window.addEventListener('mouseup', () => {
      if (!this.isPanning) return
      this.isPanning = false
      this.renderArea.classList.remove('is-panning')
    })

    // ── Button bar ─────────────────────────────────────────────────────────
    const btnBar = document.createElement('div')
    btnBar.className = 'diagram-btn-bar'

    const editBtn = document.createElement('button')
    editBtn.className = 'diagram-btn diagram-btn-primary'
    editBtn.textContent = '✏ Editar'
    editBtn.title = 'Abrir editor visual na barra lateral'
    editBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.openEditor()
    })

    const zoomOutBtn = document.createElement('button')
    zoomOutBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomOutBtn.textContent = '−'
    zoomOutBtn.title = 'Diminuir zoom'
    zoomOutBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation()
      this.svgZoom = Math.max(0.2, this.svgZoom - 0.2)
      this.applyTransform()
    })

    const zoomResetBtn = document.createElement('button')
    zoomResetBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomResetBtn.title = 'Resetar zoom e posição'
    zoomResetBtn.textContent = '⤢'
    zoomResetBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.resetView()
    })

    const zoomInBtn = document.createElement('button')
    zoomInBtn.className = 'diagram-btn diagram-zoom-btn'
    zoomInBtn.textContent = '+'
    zoomInBtn.title = 'Aumentar zoom'
    zoomInBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation()
      this.svgZoom = Math.min(6, this.svgZoom + 0.2)
      this.applyTransform()
    })

    const copyBtn = document.createElement('button')
    copyBtn.className = 'diagram-btn'
    copyBtn.textContent = 'Copiar'
    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation()
      navigator.clipboard.writeText(this.node.textContent).then(() => {
        copyBtn.textContent = '✓'
        setTimeout(() => { copyBtn.textContent = 'Copiar' }, 2000)
      })
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'diagram-btn diagram-btn-danger'
    deleteBtn.textContent = '🗑'
    deleteBtn.title = 'Excluir diagrama'
    deleteBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.deleteSelf()
    })

    btnBar.append(editBtn, zoomOutBtn, zoomResetBtn, zoomInBtn, copyBtn, deleteBtn)

    this.dom.appendChild(this.renderArea)
    this.dom.appendChild(btnBar)

    this.renderDiagram()
  }

  private applyTransform() {
    this.svgContainer.style.transform =
      `scale(${this.svgZoom}) translate(${this.svgPan.x}px, ${this.svgPan.y}px)`
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
    const pos = this.getPos()
    if (pos === undefined) return
    useEditorStore.getState().setActiveDiagram({ code: this.node.textContent, pos })
    import('../../../store/uiStore').then(({ useUIStore }) => {
      if (!useUIStore.getState().sidebarRightOpen) {
        useUIStore.getState().toggleSidebarRight()
      }
    })
  }

  async renderDiagram() {
    this.resetView()
    const code = this.node.textContent.trim()
    if (!code) {
      this.svgContainer.innerHTML = '<div class="diagram-empty">Diagrama vazio — clique em ✏ Editar</div>'
      return
    }

    this.svgContainer.innerHTML = '<div class="diagram-loading">Renderizando...</div>'

    try {
      const id = `mermaid-diagram-${++diagramCounter}`
      const { svg } = await mermaid.render(id, code)
      this.svgContainer.innerHTML = svg
      const svgEl = this.svgContainer.querySelector('svg')
      if (svgEl) {
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.width = '100%'
        svgEl.style.height = 'auto'
        svgEl.style.display = 'block'
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.svgContainer.innerHTML =
        `<div class="diagram-error"><strong>Erro no diagrama</strong><pre>${msg}</pre></div>`
    }
  }

  update(node: PMNode) {
    if (node.type !== schema.nodes.code_block) return false
    const lang = (node.attrs.language as string) || (node.attrs.params as string) || ''
    if (lang !== 'mermaid') return false
    this.node = node
    if (this.renderTimeout) clearTimeout(this.renderTimeout)
    this.renderTimeout = setTimeout(() => this.renderDiagram(), 100)
    return true
  }

  stopEvent() { return false }
  ignoreMutation() { return true }

  destroy() {
    if (this.renderTimeout) clearTimeout(this.renderTimeout)
    const active = useEditorStore.getState().activeDiagram
    const pos = this.getPos()
    if (active && pos !== undefined && active.pos === pos) {
      useEditorStore.getState().setActiveDiagram(null)
    }
  }
}
