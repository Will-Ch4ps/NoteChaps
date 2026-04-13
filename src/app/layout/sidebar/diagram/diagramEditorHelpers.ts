// ─── Diagram type detection ───────────────────────────────────────────────────

export type DiagramType = 'flowchart' | 'sequence' | 'er' | 'gantt' | 'unknown'

export function detectDiagramType(code: string): DiagramType {
  const first = code.trim().split('\n')[0]?.toLowerCase() ?? ''
  if (first.startsWith('flowchart') || first.startsWith('graph')) return 'flowchart'
  if (first.startsWith('sequencediagram')) return 'sequence'
  if (first.startsWith('erdiagram')) return 'er'
  if (first.startsWith('gantt')) return 'gantt'
  return 'unknown'
}

export const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: 'Fluxograma',
  sequence: 'Sequência',
  er: 'Diagrama ER',
  gantt: 'Gantt',
  unknown: 'Diagrama',
}

// ─── Flowchart ────────────────────────────────────────────────────────────────

export interface FlowNode { id: string; label: string; shape: 'rect' | 'round' | 'diamond' | 'stadium' }
export interface FlowEdge { from: string; to: string; label: string; style: '-->' | '--->' | '-.->' }

// Shape openers/closers used in buildFlowchart
const SHAPE_OPEN  = (s: FlowNode['shape']) => s === 'diamond' ? '{' : s === 'stadium' ? '([' : s === 'round' ? '(' : '['
const SHAPE_CLOSE = (s: FlowNode['shape']) => s === 'diamond' ? '}' : s === 'stadium' ? '])' : s === 'round' ? ')' : ']'

// Detects the shape from the opening bracket sequence
function shapeFromOpener(opener: string): FlowNode['shape'] {
  if (opener === '{')  return 'diamond'
  if (opener === '([') return 'stadium'
  if (opener === '(')  return 'round'
  return 'rect'
}

/**
 * Robust flowchart parser.
 * Strategy: on each non-comment line, first check if it's an edge line
 * (contains an arrow token NOT inside brackets), then check if it's a node
 * definition. Edges on lines that also define inline nodes are handled by
 * extracting the node definitions from each side of the arrow.
 */
export function parseFlowchart(code: string): { direction: string; nodes: FlowNode[]; edges: FlowEdge[] } {
  const lines     = code.split('\n')
  const firstLine = lines[0]?.trim() ?? ''
  const direction = /\bLR\b/.test(firstLine) ? 'LR' : /\bRL\b/.test(firstLine) ? 'RL' : /\bBT\b/.test(firstLine) ? 'BT' : 'TD'

  const nodes: FlowNode[]  = []
  const edges: FlowEdge[]  = []
  const seenNode = new Set<string>()

  // Arrow patterns (not inside brackets)
  // Matches: --> | ---> | -.-> | ==> | --text--> etc.
  const ARROW_RE = /(-\.->|---?>|-->|==>)/

  // Extracts a node from a segment like "A[Label]" or "A([Label])" or "A{Label}" or just "A"
  const extractNodeFromSegment = (seg: string): { id: string; nodeMatch: boolean; shape: FlowNode['shape']; label: string } | null => {
    const s = seg.trim()
    if (!s) return null
    // Full node definition: id + shape brackets
    const m = s.match(/^(\w+)\s*(\(\[|\[|\(|\{)(.+?)(\]\)|\]|\)|\})\s*$/)
    if (m) {
      return { id: m[1], nodeMatch: true, shape: shapeFromOpener(m[2]), label: m[3] }
    }
    // Bare id
    const bare = s.match(/^(\w+)$/)
    if (bare) return { id: bare[1], nodeMatch: false, shape: 'rect', label: bare[1] }
    return null
  }

  const registerNode = (id: string, label: string, shape: FlowNode['shape'], explicit: boolean) => {
    if (seenNode.has(id)) return
    seenNode.add(id)
    // Only add as a node entry if it has explicit shape/label, or was a bare id
    nodes.push({ id, label: explicit ? label : id, shape })
  }

  for (const raw of lines.slice(1)) {
    const t = raw.trim()
    if (!t || t.startsWith('%') || t.startsWith('subgraph') || t === 'end') continue

    // Split on arrow to detect edge lines
    // We need to be careful: label text can contain |...| AFTER the arrow
    // Pattern: <from-segment> <arrow> [|label|] <to-segment>
    const edgeRe = /^(.+?)\s*(-\.->|---?>|-->|==>)\s*(?:\|([^|]*)\|)?\s*(.+)$/
    const em = t.match(edgeRe)
    if (em) {
      const [, fromSeg, rawArrow, pipeLabel, toSeg] = em
      const fromNode = extractNodeFromSegment(fromSeg)
      const toNode   = extractNodeFromSegment(toSeg)

      if (fromNode) registerNode(fromNode.id, fromNode.label, fromNode.shape, fromNode.nodeMatch)
      if (toNode)   registerNode(toNode.id, toNode.label, toNode.shape, toNode.nodeMatch)

      if (fromNode && toNode) {
        const style: FlowEdge['style'] = rawArrow.includes('-.') ? '-.->' : rawArrow.includes('--->') ? '--->' : '-->'
        edges.push({ from: fromNode.id, to: toNode.id, label: pipeLabel ?? '', style })
      }
      continue
    }

    // Standalone node definition (no arrow)
    const nodeOnly = t.match(/^(\w+)\s*(\(\[|\[|\(|\{)(.+?)(\]\)|\]|\)|\})/)
    if (nodeOnly) {
      const id    = nodeOnly[1]
      const shape = shapeFromOpener(nodeOnly[2])
      const label = nodeOnly[3]
      registerNode(id, label, shape, true)
    }
  }

  return { direction, nodes, edges }
}

export function buildFlowchart(direction: string, nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines = [`flowchart ${direction}`]
  for (const n of nodes) lines.push(`    ${n.id}${SHAPE_OPEN(n.shape)}${n.label}${SHAPE_CLOSE(n.shape)}`)
  for (const e of edges) {
    const label = e.label ? `|${e.label}|` : ''
    lines.push(`    ${e.from} ${e.style}${label} ${e.to}`)
  }
  return lines.join('\n')
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

export interface SeqParticipant { id: string; alias: string }
export interface SeqMessage { from: string; to: string; text: string; style: '->>' | '-->>' }

export function parseSequence(code: string): { participants: SeqParticipant[]; messages: SeqMessage[] } {
  const participants: SeqParticipant[] = []
  const messages: SeqMessage[] = []
  const seen = new Set<string>()

  const ensureP = (id: string) => {
    if (!seen.has(id)) { seen.add(id); participants.push({ id, alias: id }) }
  }

  for (const line of code.split('\n')) {
    const t = line.trim()
    const pm = t.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?/)
    if (pm) {
      if (!seen.has(pm[1])) { seen.add(pm[1]); participants.push({ id: pm[1], alias: pm[2] ?? pm[1] }) }
      continue
    }
    const mm = t.match(/^(\w+)(->>|-->>)(\w+):\s*(.+)/)
    if (mm) {
      ensureP(mm[1]); ensureP(mm[3])
      messages.push({ from: mm[1], to: mm[3], text: mm[4], style: mm[2] as SeqMessage['style'] })
    }
  }

  return { participants, messages }
}

export function buildSequence(participants: SeqParticipant[], messages: SeqMessage[]): string {
  const lines = ['sequenceDiagram']
  for (const p of participants)
    lines.push(p.alias !== p.id ? `    participant ${p.id} as ${p.alias}` : `    participant ${p.id}`)
  if (messages.length) lines.push('')
  for (const m of messages) lines.push(`    ${m.from}${m.style}${m.to}: ${m.text}`)
  return lines.join('\n')
}

// ─── ER ───────────────────────────────────────────────────────────────────────

export interface ErField { type: string; name: string; key: '' | 'PK' | 'FK' }
export interface ErEntity { name: string; fields: ErField[] }
export interface ErRel { from: string; rel: string; to: string; label: string }

export function parseEr(code: string): { entities: ErEntity[]; rels: ErRel[] } {
  const entities: ErEntity[] = []
  const rels: ErRel[] = []
  let current: ErEntity | null = null

  for (const line of code.split('\n')) {
    const t = line.trim()
    if (t.match(/^[A-Z_]+\s*\{/)) {
      current = { name: t.replace(/\s*\{.*/, '').trim(), fields: [] }
      entities.push(current)
    } else if (t === '}') {
      current = null
    } else if (current && t) {
      const m = t.match(/^(\w+)\s+(\w+)(?:\s+(PK|FK))?/)
      if (m) current.fields.push({ type: m[1], name: m[2], key: (m[3] as '' | 'PK' | 'FK') ?? '' })
    } else if (!current && t.includes('||')) {
      const m = t.match(/^(\w+)\s+(\S+)\s+(\w+)\s*:\s*"([^"]*)"/)
      if (m) rels.push({ from: m[1], rel: m[2], to: m[3], label: m[4] })
    }
  }

  return { entities, rels }
}

export function buildEr(entities: ErEntity[], rels: ErRel[]): string {
  const lines = ['erDiagram']
  for (const e of entities) {
    lines.push(`    ${e.name} {`)
    for (const f of e.fields) lines.push(`        ${f.type} ${f.name}${f.key ? ' ' + f.key : ''}`)
    lines.push(`    }`)
    lines.push('')
  }
  for (const r of rels) lines.push(`    ${r.from} ${r.rel} ${r.to} : "${r.label}"`)
  return lines.join('\n')
}

// ─── Gantt ────────────────────────────────────────────────────────────────────

export interface GanttTask { section: string; name: string; id: string; start: string; duration: string }

export function parseGantt(code: string): { title: string; tasks: GanttTask[] } {
  let title = ''
  let section = 'Geral'
  const tasks: GanttTask[] = []

  for (const line of code.split('\n')) {
    const t = line.trim()
    if (t.startsWith('title ')) { title = t.slice(6); continue }
    if (t.startsWith('section ')) { section = t.slice(8); continue }
    if (t.startsWith('dateFormat') || t.startsWith('axisFormat') || !t || t.startsWith('gantt')) continue
    const m = t.match(/^(.+?)\s*:\s*(?:(\w+),\s*)?(\d{4}-\d{2}-\d{2}|after \w+),\s*(\d+[dhw])/)
    if (m) tasks.push({ section, name: m[1].trim(), id: m[2] ?? '', start: m[3], duration: m[4] })
  }

  return { title, tasks }
}

export function buildGantt(title: string, tasks: GanttTask[]): string {
  const lines = ['gantt', `    title ${title}`, '    dateFormat  YYYY-MM-DD']
  let lastSection = ''
  for (const t of tasks) {
    if (t.section !== lastSection) { lines.push(`    section ${t.section}`); lastSection = t.section }
    lines.push(`    ${t.name}  :${t.id ? t.id + ', ' : ''}${t.start}, ${t.duration}`)
  }
  return lines.join('\n')
}
