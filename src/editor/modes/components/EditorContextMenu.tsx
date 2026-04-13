import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { EditorView } from 'prosemirror-view'
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands'
import { schema } from '../../core/schema'

const I = {
  Cut: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Paste: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  PastePlain: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  Underline: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>,
  Strike: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-6.2 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16"/></svg>,
  H: ({ n }: { n: number }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8m-8-6v12m8-12v12"/><text x="15" y="17" fontSize="9" fill="currentColor" fontWeight="bold">{n}</text></svg>,
  Para: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v16M17 4v16M13 4H7.5a3.5 3.5 0 0 0 0 7H13"/></svg>,
  Code: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Quote: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  SelectAll: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11H3v8h6m4-18h8v8h-8M9 3H3v6h6"/></svg>,
  SpellCheck: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  SpellSuggestion: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  DictAdd: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
  ImageResize: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline><path d="M21 12l-3-3 3-3"></path></svg>,
}

interface EditorContextMenuProps {
  x: number
  y: number
  view: EditorView
  clickPos: number | null
  onClose: () => void
  onPastePlain: () => void
  spellSuggestions: { word: string; suggestions: string[] } | null
}

type MenuItemDef = {
  icon: React.ReactNode
  label: string
  shortcut?: string
  action: () => void
  active?: boolean
  highlight?: boolean
  bold?: boolean
  dimmed?: boolean
}
type MenuGroup = MenuItemDef[]
type MenuContent = (MenuGroup | 'sep')[]

/**
 * Substitui a palavra errada usando a API nativa do Chromium (mais confiável).
 * Fallback: substituição manual via ProseMirror se a API nativa não estiver disponível.
 */
function applySuggestion(
  view: EditorView,
  clickPos: number | null,
  misspelledWord: string,
  suggestion: string
) {
  // Estratégia 1: API nativa do Chromium (mais confiável)
  // O Chromium rastreia internamente qual palavra está sublinhada em vermelho,
  // então replaceMisspelling() substitui exatamente a palavra certa.
  if (window.electronAPI?.replaceMisspelling) {
    window.electronAPI.replaceMisspelling(suggestion)
    return
  }

  // Estratégia 2: Fallback manual via ProseMirror
  replaceMisspelledWordManual(view, clickPos, misspelledWord, suggestion)
}

/**
 * Fallback: substituição manual buscando a palavra no texto do ProseMirror.
 */
function replaceMisspelledWordManual(
  view: EditorView,
  clickPos: number | null,
  misspelledWord: string,
  suggestion: string
) {
  if (clickPos === null) return
  const $pos = view.state.doc.resolve(clickPos)
  if (!$pos.parent.isTextblock) return

  const text = $pos.parent.textContent
  const offset = $pos.parentOffset
  const safeWord = misspelledWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${safeWord}\\b`, 'gi')

  let match
  let bestStart = -1
  while ((match = regex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (offset >= start - 1 && offset <= end + 1) {
      bestStart = start
      break
    }
  }

  if (bestStart === -1) {
    bestStart = text.lastIndexOf(misspelledWord, offset)
    if (bestStart === -1) bestStart = text.indexOf(misspelledWord)
  }

  if (bestStart !== -1) {
    const nodeStart = $pos.start()
    view.dispatch(view.state.tr.replaceWith(
      nodeStart + bestStart,
      nodeStart + bestStart + misspelledWord.length,
      view.state.schema.text(suggestion)
    ))
  }
}

function resizeSelectedImage(view: EditorView, scale: number) {
  const { state } = view
  const { from, to } = state.selection
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'image') {
      const attrs = { ...node.attrs }
      if (attrs.width && attrs.height) {
        attrs.width = Math.round(attrs.width * scale)
        attrs.height = Math.round(attrs.height * scale)
      } else {
        attrs.width = 300 * scale
      }
      view.dispatch(state.tr.setNodeMarkup(pos, null, attrs))
      return false
    }
    return true
  })
}

export function EditorContextMenu({ x, y, view, clickPos, onClose, onPastePlain, spellSuggestions }: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const openedAt = useRef(Date.now())

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (Date.now() - openedAt.current < 120) return
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const run = (fn: () => void) => { fn(); onClose(); setTimeout(() => view.focus(), 40) }

  const W = 290, H = 560, P = 12
  const left = x + W > window.innerWidth - P ? window.innerWidth - W - P : x
  const top = y + H > window.innerHeight - P ? Math.max(P, window.innerHeight - H - P) : y

  const hasImageSelected = (() => {
    const { from, to } = view.state.selection
    let found = false
    view.state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'image') {
        found = true
        return false
      }
      return true
    })
    return found
  })()

  const { from, to, empty } = view.state.selection
  const selectedText = empty ? '' : view.state.doc.textBetween(from, to).trim()

  // ─── Construção do grupo de ortografia ─────────────────────────────────
  const spellGroup: MenuGroup = []
  const hasMisspelled = !!spellSuggestions?.word
  const hasSuggestions = !!spellSuggestions?.suggestions?.length

  if (hasMisspelled && spellSuggestions) {
    if (hasSuggestions) {
      // Sugestões de correção — aparecem no topo com destaque
      spellSuggestions.suggestions.slice(0, 7).forEach(word => {
        spellGroup.push({
          icon: <I.SpellSuggestion />,
          label: word,
          highlight: true,
          bold: true,
          action: () => applySuggestion(view, clickPos, spellSuggestions.word, word)
        })
      })
    } else {
      // Palavra errada mas sem sugestões disponíveis
      spellGroup.push({
        icon: <I.SpellCheck />,
        label: `Sem sugestões para "${spellSuggestions.word}"`,
        dimmed: true,
        action: () => {} // no-op
      })
    }

    // "Adicionar ao dicionário" — sempre aparece quando há palavra errada
    spellGroup.push({
      icon: <I.DictAdd />,
      label: `Adicionar "${spellSuggestions.word}" ao dicionário`,
      action: () => {
        if (window.electronAPI?.addToSpellCheckerDictionary) {
          window.electronAPI.addToSpellCheckerDictionary(spellSuggestions.word)
        }
      }
    })
  }
  // Sem palavra errada: menu começa direto em Recortar/Copiar (como navegadores fazem)

  // ─── Construção dos grupos do menu ─────────────────────────────────────
  const groups: MenuContent = []

  if (spellGroup.length > 0) {
    groups.push(spellGroup, 'sep')
  }

  groups.push(
    [
      { icon: <I.Cut />, label: 'Recortar', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
      { icon: <I.Copy />, label: 'Copiar', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
      { icon: <I.Paste />, label: 'Colar', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
      { icon: <I.PastePlain />, label: 'Colar sem formatação', shortcut: 'Ctrl+Shift+V', action: onPastePlain }
    ],
    'sep',
    [
      { icon: <I.Bold />, label: 'Negrito', shortcut: 'Ctrl+B', action: () => toggleMark(schema.marks.strong)(view.state, view.dispatch) },
      { icon: <I.Italic />, label: 'Itálico', shortcut: 'Ctrl+I', action: () => toggleMark(schema.marks.em)(view.state, view.dispatch) },
      { icon: <I.Underline />, label: 'Sublinhado', shortcut: 'Ctrl+U', action: () => toggleMark(schema.marks.underline)(view.state, view.dispatch) },
      { icon: <I.Strike />, label: 'Tachado', action: () => toggleMark(schema.marks.strikethrough)(view.state, view.dispatch) }
    ],
    'sep',
    [
      { icon: <I.H n={1} />, label: 'Título 1', action: () => setBlockType(schema.nodes.heading, { level: 1 })(view.state, view.dispatch) },
      { icon: <I.H n={2} />, label: 'Título 2', action: () => setBlockType(schema.nodes.heading, { level: 2 })(view.state, view.dispatch) },
      { icon: <I.H n={3} />, label: 'Título 3', action: () => setBlockType(schema.nodes.heading, { level: 3 })(view.state, view.dispatch) },
      { icon: <I.Para />, label: 'Parágrafo', action: () => setBlockType(schema.nodes.paragraph)(view.state, view.dispatch) }
    ],
    'sep',
    [
      { icon: <I.Code />, label: 'Bloco de código', action: () => setBlockType(schema.nodes.code_block)(view.state, view.dispatch) },
      { icon: <I.Quote />, label: 'Citação', action: () => wrapIn(schema.nodes.blockquote)(view.state, view.dispatch) }
    ]
  )

  if (hasImageSelected) {
    groups.push(
      'sep',
      [
        { icon: <I.ImageResize />, label: 'Redimensionar: 50%', action: () => resizeSelectedImage(view, 0.5) },
        { icon: <I.ImageResize />, label: 'Redimensionar: 100%', action: () => resizeSelectedImage(view, 1.0) },
        { icon: <I.ImageResize />, label: 'Redimensionar: 150%', action: () => resizeSelectedImage(view, 1.5) }
      ]
    )
  }

  groups.push(
    'sep',
    [{ icon: <I.SelectAll />, label: 'Selecionar tudo', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') }]
  )

  // Grupos sem o spellGroup (renderizado separadamente no topo como chips)
  const mainGroups: MenuContent = hasMisspelled
    ? groups.slice(2)   // remove spellGroup (gi=0) e sep (gi=1)
    : groups

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 999999, width: W }}
      className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in-scale"
      onClick={e => e.stopPropagation()}
    >
      <div className="overflow-y-auto" style={{ maxHeight: H }}>

        {/* ── Seção de sugestões ortográficas — estilo navegador ─────────── */}
        {hasMisspelled && spellSuggestions && (
          <div className="px-3 pt-2.5 pb-2 border-b border-[#3a3a3a]">
            {hasSuggestions ? (
              <>
                <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1.5 select-none">
                  Sugestões para "{spellSuggestions.word}"
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {spellSuggestions.suggestions.slice(0, 7).map((word, i) => (
                    <button
                      key={i}
                      onClick={() => run(() => applySuggestion(view, clickPos, spellSuggestions.word, word))}
                      className="px-2.5 py-1 rounded-md text-[13px] font-semibold text-white bg-[#1a6fcf] hover:bg-[#2080e8] transition-colors duration-100"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[#666] py-0.5 italic select-none">
                Sem sugestões para "{spellSuggestions.word}"
              </p>
            )}
            <button
              onClick={() => run(() => {
                if (window.electronAPI?.addToSpellCheckerDictionary) {
                  window.electronAPI.addToSpellCheckerDictionary(spellSuggestions.word)
                }
              })}
              className="mt-2 w-full text-left flex items-center gap-2 text-[12px] text-[#aaa] hover:text-[#d4d4d4] transition-colors duration-100 py-0.5"
            >
              <span className="w-4 h-4 flex items-center justify-center opacity-70"><I.DictAdd /></span>
              Adicionar "{spellSuggestions.word}" ao dicionário
            </button>
          </div>
        )}

        {/* ── Itens restantes do menu ─────────────────────────────────────── */}
        <div className="py-1">
          {mainGroups.map((g, gi) =>
            g === 'sep'
              ? <div key={`s${gi}`} className="h-px bg-[#3a3a3a] my-1" />
              : <div key={`g${gi}`}>
                  {g.map((item, ii) => (
                    <button
                      key={ii}
                      onClick={() => item.dimmed ? undefined : run(item.action)}
                      disabled={!!item.dimmed}
                      className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between transition-colors duration-100
                        ${item.dimmed
                          ? 'text-[#666] cursor-default'
                          : 'hover:bg-[#3a3a3a]'
                        }
                        ${item.active ? 'bg-[#4a9eff22]' : ''}
                        ${item.highlight && !item.dimmed ? 'text-[#4a9eff]' : ''}
                        ${!item.highlight && !item.dimmed ? 'text-[#d4d4d4]' : ''}
                      `}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 flex items-center justify-center opacity-80">{item.icon}</span>
                        <span className={item.bold ? 'font-semibold' : ''}>{item.label}</span>
                      </span>
                      {item.shortcut && <span className="text-[#666] text-[11px] font-mono ml-4">{item.shortcut}</span>}
                    </button>
                  ))}
                </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
