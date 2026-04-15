export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'er'
  | 'gantt'
  | 'state'
  | 'class'
  | 'journey'
  | 'pie'
  | 'gitgraph'
  | 'mindmap'
  | 'timeline'
  | 'quadrant'
  | 'requirement'
  | 'sankey'
  | 'unknown'

const LANGUAGE_TO_DIRECTIVE: Array<{ test: RegExp; directive: string }> = [
  { test: /^(mermaid|mmd)$/i, directive: '' },
  { test: /^flowchart$/i, directive: 'flowchart TD' },
  { test: /^graph$/i, directive: 'flowchart TD' },
  { test: /^sequence(diagram)?$/i, directive: 'sequenceDiagram' },
  { test: /^er(diagram)?$/i, directive: 'erDiagram' },
  { test: /^gantt$/i, directive: 'gantt' },
  { test: /^state(diagram)?(-v2)?$/i, directive: 'stateDiagram-v2' },
  { test: /^class(diagram)?$/i, directive: 'classDiagram' },
  { test: /^journey$/i, directive: 'journey' },
  { test: /^pie$/i, directive: 'pie' },
  { test: /^git(graph)?$/i, directive: 'gitGraph' },
  { test: /^mindmap$/i, directive: 'mindmap' },
  { test: /^timeline$/i, directive: 'timeline' },
  { test: /^quadrant(chart)?$/i, directive: 'quadrantChart' },
  { test: /^requirement(diagram)?$/i, directive: 'requirementDiagram' },
  { test: /^sankey(-beta)?$/i, directive: 'sankey-beta' }
]

export const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: 'Fluxograma',
  sequence: 'Sequencia',
  er: 'Diagrama ER',
  gantt: 'Gantt',
  state: 'Diagrama de Estados',
  class: 'Diagrama de Classes',
  journey: 'Journey',
  pie: 'Grafico Pizza',
  gitgraph: 'Fluxo Git',
  mindmap: 'Mapa Mental',
  timeline: 'Timeline',
  quadrant: 'Quadrante',
  requirement: 'Requisitos',
  sankey: 'Sankey',
  unknown: 'Diagrama'
}

function firstMermaidDirective(code: string): string {
  const lines = code
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('%%')) continue
    return line.toLowerCase()
  }

  return ''
}

function languageFallbackDirective(language?: string): string {
  const lang = (language ?? '').trim()
  if (!lang) return ''
  const rule = LANGUAGE_TO_DIRECTIVE.find((entry) => entry.test.test(lang))
  return rule?.directive ?? ''
}

export function detectDiagramType(code: string, language?: string): DiagramType {
  const first = firstMermaidDirective(code)
  if (first.startsWith('flowchart') || first.startsWith('graph')) return 'flowchart'
  if (first.startsWith('sequencediagram')) return 'sequence'
  if (first.startsWith('erdiagram')) return 'er'
  if (first.startsWith('gantt')) return 'gantt'
  if (first.startsWith('statediagram')) return 'state'
  if (first.startsWith('classdiagram')) return 'class'
  if (first.startsWith('journey')) return 'journey'
  if (first.startsWith('pie')) return 'pie'
  if (first.startsWith('gitgraph')) return 'gitgraph'
  if (first.startsWith('mindmap')) return 'mindmap'
  if (first.startsWith('timeline')) return 'timeline'
  if (first.startsWith('quadrantchart')) return 'quadrant'
  if (first.startsWith('requirementdiagram')) return 'requirement'
  if (first.startsWith('sankey-beta') || first.startsWith('sankey')) return 'sankey'

  const fallback = languageFallbackDirective(language)
  if (fallback.startsWith('flowchart')) return 'flowchart'
  if (fallback.startsWith('sequence')) return 'sequence'
  if (fallback.startsWith('er')) return 'er'
  if (fallback.startsWith('gantt')) return 'gantt'
  if (fallback.startsWith('state')) return 'state'
  if (fallback.startsWith('class')) return 'class'
  if (fallback.startsWith('journey')) return 'journey'
  if (fallback.startsWith('pie')) return 'pie'
  if (fallback.startsWith('gitGraph')) return 'gitgraph'
  if (fallback.startsWith('mindmap')) return 'mindmap'
  if (fallback.startsWith('timeline')) return 'timeline'
  if (fallback.startsWith('quadrant')) return 'quadrant'
  if (fallback.startsWith('requirement')) return 'requirement'
  if (fallback.startsWith('sankey')) return 'sankey'
  return 'unknown'
}

export function isMermaidBlock(language: string, code: string): boolean {
  const lang = (language ?? '').trim().toLowerCase()
  if (!lang) return detectDiagramType(code) !== 'unknown'
  if (lang === 'mermaid' || lang === 'mmd') return true
  return languageFallbackDirective(lang) !== ''
}

export function getMermaidRenderCode(language: string, code: string): string {
  const trimmed = code.trim()
  if (!trimmed) return ''

  const hasDirective = detectDiagramType(trimmed) !== 'unknown'
  if (hasDirective) return trimmed

  const fallbackDirective = languageFallbackDirective(language)
  if (!fallbackDirective) return trimmed
  if (!fallbackDirective.trim()) return trimmed
  return `${fallbackDirective}\n${trimmed}`
}
