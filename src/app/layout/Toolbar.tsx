import { useCallback, useState } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useEditorStore } from '../../store/editorStore'
import {
  applyMark, setHeading, setParagraph,
  isMarkActive, getActiveHeadingLevel
} from '../../editor/core/commands/formatting'
import { toggleBulletList, toggleOrderedList, insertTaskList } from '../../editor/core/commands/lists'
import { insertImage, insertLink, insertHorizontalRule, insertTable, insertDiagram } from '../../editor/core/commands/insert'
import { setBlockType, wrapIn } from 'prosemirror-commands'
import { undo, redo, undoDepth, redoDepth } from 'prosemirror-history'
import { schema } from '../../editor/core/schema'
import { Icons } from './toolbar/ToolbarIcons'
import { ToolbarButton, Divider, ToolbarGroup } from './toolbar/ToolbarButton'
import { InsertImageModal } from './toolbar/InsertImageModal'
import { InsertLinkModal } from './toolbar/InsertLinkModal'
import { InsertTableModal } from './toolbar/InsertTableModal'
import { DiagramPickerModal } from './toolbar/DiagramPickerModal'

// ─── FormatBadge ─────────────────────────────────────────────────────────────

function FormatBadge() {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#4a9eff22] text-[#4a9eff]"
      title="Markdown (.md)"
    >
      <Icons.MarkdownBadge />
      <span className="text-xs font-mono font-bold">MD</span>
    </div>
  )
}

// ─── Toolbar Principal ───────────────────────────────────────────────────────

export function Toolbar() {
  const { getActiveTab, setMode } = useTabsStore()
  const { activeView, appActions, formatPainter, setFormatPainter } = useEditorStore()
  const tab = getActiveTab()
  const isRaw = tab?.mode === 'raw'
  const isVisual = tab?.mode === 'visual'

  const disabled = !tab || isRaw || !activeView

  const painterActive = !!formatPainter?.active

  // Estado dos modais
  const [showImageModal, setShowImageModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showDiagramModal, setShowDiagramModal] = useState(false)

  const captureFormat = useCallback(() => {
    if (!activeView) return
    if (painterActive) { setFormatPainter(null); return }

    const { from, to, empty, $from } = activeView.state.selection
    const marks: Array<{ type: string; attrs: Record<string, unknown> }> = []

    if (empty) {
      const stored = activeView.state.storedMarks ?? $from.marks()
      stored.forEach(m => marks.push({ type: m.type.name, attrs: m.attrs as Record<string, unknown> }))
    } else {
      activeView.state.doc.nodesBetween(from, to, node => {
        node.marks.forEach(m => {
          if (!marks.find(x => x.type === m.type.name)) {
            marks.push({ type: m.type.name, attrs: m.attrs as Record<string, unknown> })
          }
        })
      })
    }

    const parent = $from.parent
    const blockType = { name: parent.type.name, attrs: parent.attrs as Record<string, unknown> }
    setFormatPainter({ active: true, marks, blockType })
  }, [activeView, painterActive, setFormatPainter])

  const withView = (fn: (view: NonNullable<typeof activeView>) => void) => () => {
    if (!activeView || isRaw) return
    fn(activeView)
  }

  const handleModeToggle = () => {
    if (!tab) return
    setMode(tab.id, isRaw ? 'visual' : 'raw')
  }

  const checkMark    = (mark: string) => activeView && isVisual ? isMarkActive(activeView, mark) : false
  const checkHeading = (level: number) => activeView && isVisual ? getActiveHeadingLevel(activeView) === level : false
  const checkList    = (type: string) => {
    if (!activeView || !isVisual) return false
    const { $from } = activeView.state.selection
    for (let i = $from.depth; i > 0; i--) {
      if ($from.node(i).type.name === type) return true
    }
    return false
  }
  const checkBlock = (type: string) => {
    if (!activeView || !isVisual) return false
    return activeView.state.selection.$from.parent.type.name === type
  }

  const canUndo = activeView && isVisual ? undoDepth(activeView.state) > 0 : false
  const canRedo = activeView && isVisual ? redoDepth(activeView.state) > 0 : false

  return (
    <>
      <div className="flex items-center gap-1 px-4 h-12 bg-[#2a2a2a] border-b border-[#333] overflow-x-auto scrollbar-hide shadow-sm">

        {/* ARQUIVO */}
        <ToolbarGroup>
          <ToolbarButton title="Salvar (Ctrl+S)" disabled={!tab} onClick={() => appActions.save?.()}>
            <Icons.Save />
          </ToolbarButton>
          <ToolbarButton title="Novo arquivo (Ctrl+N)" onClick={() => appActions.newFile?.()}>
            <Icons.New />
          </ToolbarButton>
          <ToolbarButton title="Abrir arquivo (Ctrl+O)" onClick={() => appActions.openFile?.()}>
            <Icons.Open />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* UNDO / REDO */}
        <ToolbarGroup>
          <ToolbarButton title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={withView(v => { undo(v.state, v.dispatch); v.focus() })}>
            <Icons.Undo />
          </ToolbarButton>
          <ToolbarButton title="Refazer (Ctrl+Y)" disabled={!canRedo} onClick={withView(v => { redo(v.state, v.dispatch); v.focus() })}>
            <Icons.Redo />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* FORMATO */}
        {tab && <FormatBadge />}

        <Divider />

        {/* FORMATAÇÃO DE TEXTO */}
        <ToolbarGroup>
          <ToolbarButton title="Negrito (Ctrl+B)" disabled={disabled} active={checkMark('strong')} onClick={withView(v => applyMark(v, 'strong'))}>
            <Icons.Bold />
          </ToolbarButton>
          <ToolbarButton title="Itálico (Ctrl+I)" disabled={disabled} active={checkMark('em')} onClick={withView(v => applyMark(v, 'em'))}>
            <Icons.Italic />
          </ToolbarButton>
          <ToolbarButton title="Sublinhado (Ctrl+U)" disabled={disabled} active={checkMark('underline')} onClick={withView(v => applyMark(v, 'underline'))}>
            <Icons.Underline />
          </ToolbarButton>
          <ToolbarButton title="Tachado" disabled={disabled} active={checkMark('strikethrough')} onClick={withView(v => applyMark(v, 'strikethrough'))}>
            <Icons.Strikethrough />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* PINCEL DE FORMATAÇÃO */}
        <ToolbarGroup>
          <ToolbarButton
            title={painterActive ? 'Pincel ativo — selecione texto para aplicar (clique para cancelar)' : 'Copiar formatação (Pincel)'}
            disabled={disabled}
            active={painterActive}
            variant="painter"
            onClick={() => { if (!disabled) captureFormat() }}
          >
            <Icons.Painter />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* TÍTULOS E PARÁGRAFO */}
        <ToolbarGroup>
          <ToolbarButton title="Título 1 (Shift+Ctrl+1)" disabled={disabled} active={checkHeading(1)} onClick={withView(v => setHeading(v, 1))}>
            <Icons.H1 />
          </ToolbarButton>
          <ToolbarButton title="Título 2 (Shift+Ctrl+2)" disabled={disabled} active={checkHeading(2)} onClick={withView(v => setHeading(v, 2))}>
            <Icons.H2 />
          </ToolbarButton>
          <ToolbarButton title="Título 3 (Shift+Ctrl+3)" disabled={disabled} active={checkHeading(3)} onClick={withView(v => setHeading(v, 3))}>
            <Icons.H3 />
          </ToolbarButton>
          <ToolbarButton title="Parágrafo normal (Shift+Ctrl+0)" disabled={disabled} active={checkBlock('paragraph')} onClick={withView(v => setParagraph(v))}>
            <Icons.Paragraph />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* LISTAS */}
        <ToolbarGroup>
          <ToolbarButton title="Lista com marcadores" disabled={disabled} active={checkList('bullet_list')} onClick={withView(v => toggleBulletList(v))}>
            <Icons.BulletList />
          </ToolbarButton>
          <ToolbarButton title="Lista numerada" disabled={disabled} active={checkList('ordered_list')} onClick={withView(v => toggleOrderedList(v))}>
            <Icons.OrderedList />
          </ToolbarButton>
          <ToolbarButton title="Lista de tarefas" disabled={disabled} active={checkList('task_list')} onClick={withView(v => insertTaskList(v))}>
            <Icons.TaskList />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* INSERIR */}
        <ToolbarGroup>
          <ToolbarButton title="Inserir imagem" disabled={disabled} onClick={() => !disabled && setShowImageModal(true)}>
            <Icons.Image />
          </ToolbarButton>
          <ToolbarButton title="Inserir link" disabled={disabled} active={checkMark('link')} onClick={() => !disabled && setShowLinkModal(true)}>
            <Icons.Link />
          </ToolbarButton>
          <ToolbarButton title="Bloco de código (Shift+Ctrl+\\)" disabled={disabled} active={checkBlock('code_block')} onClick={withView(v => {
            setBlockType(schema.nodes.code_block)(v.state, v.dispatch)
            v.focus()
          })}>
            <Icons.Code />
          </ToolbarButton>
          <ToolbarButton title="Citação" disabled={disabled} active={checkBlock('blockquote')} onClick={withView(v => {
            wrapIn(schema.nodes.blockquote)(v.state, v.dispatch)
            v.focus()
          })}>
            <Icons.Blockquote />
          </ToolbarButton>
          <ToolbarButton title="Linha horizontal" disabled={disabled} onClick={withView(v => insertHorizontalRule(v))}>
            <Icons.HorizontalRule />
          </ToolbarButton>
        </ToolbarGroup>

        <Divider />

        {/* TÉCNICO — Tabela, Diagrama */}
        <ToolbarGroup>
          <ToolbarButton title="Inserir tabela (Ctrl+Alt+T)" disabled={disabled} onClick={() => !disabled && setShowTableModal(true)}>
            <Icons.Table />
          </ToolbarButton>
          <ToolbarButton title="Inserir diagrama (Mermaid)" disabled={disabled} onClick={() => !disabled && setShowDiagramModal(true)}>
            <Icons.Diagram />
          </ToolbarButton>
        </ToolbarGroup>

        <div className="flex-1" />

        {/* MODO */}
        <button
          title={isRaw ? 'Alternar para modo Visual (Ctrl+E)' : 'Alternar para modo Raw (Ctrl+E)'}
          onClick={handleModeToggle}
          disabled={!tab}
          className={`
            px-3 h-7 rounded-md text-xs font-mono font-bold uppercase tracking-wider
            transition-all duration-200 ease-out flex-shrink-0
            ${!tab
              ? 'bg-[#555] text-[#888] cursor-not-allowed'
              : isRaw
                ? 'bg-[#30d158] text-[#1a1a1a] shadow-md hover:bg-[#28c04d]'
                : 'bg-[#4a9eff] text-[#1a1a1a] shadow-md hover:bg-[#3a8eef]'
            }
          `}
        >
          {isRaw ? 'RAW' : 'VISUAL'}
        </button>
      </div>

      {/* MODAIS */}
      {showImageModal && activeView && (
        <InsertImageModal
          onConfirm={(src, alt) => insertImage(activeView, src, alt)}
          onClose={() => setShowImageModal(false)}
        />
      )}
      {showLinkModal && activeView && (
        <InsertLinkModal
          onConfirm={(href, title) => insertLink(activeView, href, title)}
          onClose={() => setShowLinkModal(false)}
        />
      )}
      {showTableModal && activeView && (
        <InsertTableModal
          onConfirm={(rows, cols) => insertTable(activeView, rows, cols)}
          onClose={() => setShowTableModal(false)}
        />
      )}
      {showDiagramModal && activeView && (
        <DiagramPickerModal
          onSelect={(code) => insertDiagram(activeView, code)}
          onClose={() => setShowDiagramModal(false)}
        />
      )}
    </>
  )
}
