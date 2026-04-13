import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTabsStore } from '../../../store/tabsStore'
import { useEditorStore } from '../../../store/editorStore'
import { MarkdownConverter } from '../../../filesystem/converters/MarkdownConverter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  streaming?: boolean
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// Renders inline code, bold, italic, and code blocks simply

function renderContent(text: string) {
  const lines = text.split('\n')
  const output: React.ReactNode[] = []
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []
  let key = 0

  const flushCode = () => {
    output.push(
      <pre key={key++} className="claude-code-block">
        {codeLang && <span className="claude-code-lang">{codeLang}</span>}
        <code>{codeLines.join('\n')}</code>
      </pre>
    )
    codeLines = []
    codeLang = ''
  }

  const renderInline = (line: string): React.ReactNode => {
    // Split on inline code, bold, italic
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="claude-inline-code">{part.slice(1, -1)}</code>
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        inCode = false
        flushCode()
      } else {
        inCode = true
        codeLang = line.slice(3).trim()
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (line.startsWith('### ')) {
      output.push(<h3 key={key++} className="claude-h3">{renderInline(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      output.push(<h2 key={key++} className="claude-h2">{renderInline(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      output.push(<h1 key={key++} className="claude-h1">{renderInline(line.slice(2))}</h1>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      output.push(<li key={key++} className="claude-li">{renderInline(line.slice(2))}</li>)
    } else if (line.trim() === '') {
      output.push(<div key={key++} className="claude-spacer" />)
    } else {
      output.push(<p key={key++} className="claude-p">{renderInline(line)}</p>)
    }
  }
  if (inCode) flushCode()
  return output
}

// ─── ClaudePanel ──────────────────────────────────────────────────────────────

export function ClaudePanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [useContext, setUseContext] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingIdRef = useRef<string | null>(null)

  const { getActiveTab } = useTabsStore()
  const { activeView } = useEditorStore()

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Register IPC listeners once
  useEffect(() => {
    const offChunk = window.electronAPI.onClaudeChunk((text) => {
      const id = streamingIdRef.current
      if (!id) return
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, content: m.content + text } : m
      ))
    })

    const offError = window.electronAPI.onClaudeError((msg) => {
      const id = streamingIdRef.current
      if (!id) return
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, content: msg, role: 'error', streaming: false } : m
      ))
      streamingIdRef.current = null
      setStreaming(false)
    })

    const offDone = window.electronAPI.onClaudeDone(() => {
      const id = streamingIdRef.current
      if (id) {
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, streaming: false } : m
        ))
        streamingIdRef.current = null
      }
      setStreaming(false)
    })

    return () => { offChunk(); offError(); offDone() }
  }, [])

  const getDocContext = useCallback((): string | undefined => {
    if (!useContext) return undefined
    const tab = getActiveTab()
    if (!tab) return undefined
    if (tab.mode === 'visual' && activeView) {
      return MarkdownConverter.fromDoc(activeView.state.doc).slice(0, 4000)
    }
    return tab.rawContent?.slice(0, 4000)
  }, [useContext, getActiveTab, activeView])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const asstId = (Date.now() + 1).toString()
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setInput('')
    setStreaming(true)
    streamingIdRef.current = asstId

    const ctx = getDocContext()
    const result = await window.electronAPI.claudeSend(text, ctx)
    if (result?.error) {
      setMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, content: result.error!, role: 'error', streaming: false } : m
      ))
      streamingIdRef.current = null
      setStreaming(false)
    }
  }, [input, streaming, getDocContext])

  const abort = () => {
    window.electronAPI.claudeAbort()
    setStreaming(false)
    if (streamingIdRef.current) {
      setMessages(prev => prev.map(m =>
        m.id === streamingIdRef.current ? { ...m, streaming: false, content: m.content + '\n\n*[interrompido]*' } : m
      ))
      streamingIdRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const clearChat = () => {
    if (streaming) abort()
    setMessages([])
  }

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#3e3e42] flex items-center gap-2 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="2" className="shrink-0">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 6v4l3 3"/>
        </svg>
        <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide flex-1">Claude</span>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Limpar conversa"
            className="text-[#555] hover:text-[#aaa] text-[11px] transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Context toggle */}
      <div className="px-3 py-1.5 border-b border-[#3e3e42] shrink-0 flex items-center gap-2">
        <button
          onClick={() => setUseContext(v => !v)}
          className={`flex items-center gap-1.5 text-[11px] transition-colors ${useContext ? 'text-[#4a9eff]' : 'text-[#555]'}`}
          title="Incluir conteúdo do documento atual como contexto"
        >
          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${useContext ? 'bg-[#4a9eff] border-[#4a9eff]' : 'border-[#555]'}`}>
            {useContext && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2"><polyline points="1.5,5 4,7.5 8.5,2"/></svg>}
          </span>
          Usar contexto do documento
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-[12px] text-[#555] leading-relaxed max-w-[200px]">
              Converse com o Claude sobre seu documento ou qualquer dúvida de desenvolvimento.
            </p>
            <div className="flex flex-col gap-1 w-full">
              {['Explique este documento', 'Revise e sugira melhorias', 'Crie um resumo'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  className="text-[11px] text-[#4a9eff] hover:bg-[#4a9eff11] py-1 px-2 rounded text-left transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${
              msg.role === 'user' ? 'text-[#4a9eff]' : msg.role === 'error' ? 'text-[#ff6b6b]' : 'text-[#555]'
            }`}>
              {msg.role === 'user' ? 'Você' : msg.role === 'error' ? 'Erro' : 'Claude'}
            </div>
            <div className={`claude-msg ${
              msg.role === 'user'
                ? 'claude-msg-user'
                : msg.role === 'error'
                ? 'claude-msg-error'
                : 'claude-msg-assistant'
            }`}>
              {msg.role === 'user'
                ? <p className="claude-p">{msg.content}</p>
                : renderContent(msg.content)
              }
              {msg.streaming && (
                <span className="claude-cursor">▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-[#3e3e42] shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao Claude... (Enter envia, Shift+Enter nova linha)"
            rows={1}
            className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] text-[#e0e0e0] text-[12px] rounded-lg px-3 py-2 outline-none focus:border-[#4a9eff] resize-none transition-colors placeholder-[#555] scrollbar-thin"
            style={{ minHeight: 36, maxHeight: 120 }}
            disabled={streaming}
          />
          {streaming ? (
            <button
              onClick={abort}
              title="Parar geração"
              className="shrink-0 w-8 h-8 rounded-lg bg-[#3a3a3a] hover:bg-[#ff6b6b22] border border-[#555] hover:border-[#ff6b6b] text-[#ff6b6b] flex items-center justify-center transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="1"/></svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              title="Enviar (Enter)"
              className="shrink-0 w-8 h-8 rounded-lg bg-[#4a9eff] hover:bg-[#3a8eef] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
        <p className="text-[9px] text-[#444] mt-1">Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
