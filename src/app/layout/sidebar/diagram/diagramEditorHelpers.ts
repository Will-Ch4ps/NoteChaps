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

export type FlowShape = 'rect' | 'round' | 'diamond' | 'stadium' | 'circle' | 'hexagon' | 'parallelogram' | 'trapezoid' | 'cylinder' | 'subroutine'
export interface FlowNode {
  id: string
  label: string
  shape: FlowShape
  fill?: string
  stroke?: string
  textColor?: string
}
export interface FlowEdge { from: string; to: string; label: string; style: '-->' | '--->' | '-.->' | '==>' }
export interface FlowGroup {
  id: string
  label: string
  parentId?: string
  nodeIds: string[]
  fill?: string
  stroke?: string
  textColor?: string
}

export const SHAPE_OPTIONS: Array<{ value: FlowShape; icon: string; label: string }> = [
  { value: 'rect',          icon: '▭', label: 'Retângulo' },
  { value: 'round',         icon: '◖', label: 'Arredondado' },
  { value: 'stadium',       icon: '⬭', label: 'Stadium' },
  { value: 'diamond',       icon: '◇', label: 'Decisão' },
  { value: 'circle',        icon: '○', label: 'Círculo' },
  { value: 'hexagon',       icon: '⬡', label: 'Hexágono' },
  { value: 'parallelogram', icon: '▱', label: 'Paralelogramo' },
  { value: 'trapezoid',     icon: '⏢', label: 'Trapézio' },
  { value: 'cylinder',      icon: '⌭', label: 'Cilindro' },
  { value: 'subroutine',    icon: '❐', label: 'Sub-rotina' },
]

export const COLOR_PRESETS: Array<{ name: string; fill: string; stroke: string; textColor: string }> = [
  { name: 'Padrão',   fill: '',        stroke: '',        textColor: '' },
  { name: 'Azul',     fill: '#1e3a8a', stroke: '#4a9eff', textColor: '#e0e8ff' },
  { name: 'Verde',    fill: '#14532d', stroke: '#4ade80', textColor: '#d1fadf' },
  { name: 'Vermelho', fill: '#7f1d1d', stroke: '#f87171', textColor: '#fee2e2' },
  { name: 'Amarelo',  fill: '#713f12', stroke: '#facc15', textColor: '#fef3c7' },
  { name: 'Roxo',     fill: '#581c87', stroke: '#c084fc', textColor: '#f3e8ff' },
  { name: 'Cinza',    fill: '#374151', stroke: '#9ca3af', textColor: '#e5e7eb' },
]

// Shape openers/closers used in buildFlowchart
const SHAPE_OPEN = (s: FlowShape): string => {
  switch (s) {
    case 'diamond': return '{'
    case 'stadium': return '(['
    case 'round': return '('
    case 'circle': return '(('
    case 'hexagon': return '{{'
    case 'parallelogram': return '[/'
    case 'trapezoid': return '[/'
    case 'cylinder': return '[('
    case 'subroutine': return '[['
    default: return '['
  }
}
const SHAPE_CLOSE = (s: FlowShape): string => {
  switch (s) {
    case 'diamond': return '}'
    case 'stadium': return '])'
    case 'round': return ')'
    case 'circle': return '))'
    case 'hexagon': return '}}'
    case 'parallelogram': return '/]'
    case 'trapezoid': return '\\]'
    case 'cylinder': return ')]'
    case 'subroutine': return ']]'
    default: return ']'
  }
}

// Detects the shape from the opening bracket sequence
function shapeFromOpener(opener: string): FlowShape {
  if (opener === '{{') return 'hexagon'
  if (opener === '{')  return 'diamond'
  if (opener === '([') return 'stadium'
  if (opener === '((') return 'circle'
  if (opener === '[(') return 'cylinder'
  if (opener === '[[') return 'subroutine'
  if (opener === '[/') return 'parallelogram'
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
function splitEdgeEndpoints(segment: string): string[] {
  const out: string[] = []
  let current = ''
  let depth = 0
  let inQuote = false

  for (const ch of segment) {
    if (ch === '"') {
      inQuote = !inQuote
      current += ch
      continue
    }
    if (!inQuote) {
      if (ch === '[' || ch === '(' || ch === '{') depth += 1
      if (ch === ']' || ch === ')' || ch === '}') depth = Math.max(0, depth - 1)
      if (ch === '&' && depth === 0) {
        if (current.trim()) out.push(current.trim())
        current = ''
        continue
      }
    }
    current += ch
  }

  if (current.trim()) out.push(current.trim())
  return out
}

function parseSubgraphHeader(line: string): { id: string; label: string } | null {
  const m = line.match(/^subgraph\s+([A-Za-z0-9_]+)(?:\s*\[\s*(?:"([^"]+)"|([^\]]+))\s*\])?$/i)
  if (!m) return null
  const id = m[1]
  const label = (m[2] ?? m[3] ?? id).trim()
  return { id, label }
}

export function parseFlowchart(code: string): { direction: string; nodes: FlowNode[]; edges: FlowEdge[]; groups: FlowGroup[] } {
  const lines     = code.split('\n')
  const firstLine = lines[0]?.trim() ?? ''
  const direction = /\bLR\b/.test(firstLine) ? 'LR' : /\bRL\b/.test(firstLine) ? 'RL' : /\bBT\b/.test(firstLine) ? 'BT' : 'TD'

  const nodes: FlowNode[]  = []
  const edges: FlowEdge[]  = []
  const groups: FlowGroup[] = []
  const nodeIndex = new Map<string, number>()
  const groupIndex = new Map<string, number>()
  const groupStack: string[] = []

  const upsertGroup = (id: string, label: string, parentId?: string) => {
    const idx = groupIndex.get(id)
    if (idx !== undefined) {
      const prev = groups[idx]
      groups[idx] = { ...prev, label: label || prev.label, parentId: parentId ?? prev.parentId }
      return groups[idx]
    }
    const group: FlowGroup = { id, label: label || id, parentId, nodeIds: [] }
    groupIndex.set(id, groups.length)
    groups.push(group)
    return group
  }

  const addNodeToCurrentGroup = (nodeId: string) => {
    const groupId = groupStack[groupStack.length - 1]
    if (!groupId) return
    const idx = groupIndex.get(groupId)
    if (idx === undefined) return
    const group = groups[idx]
    if (!group.nodeIds.includes(nodeId)) {
      group.nodeIds.push(nodeId)
    }
  }

  // Extracts a node from a segment like "A[Label]" or "A([Label])" or "A{Label}" or just "A"
  const extractNodeFromSegment = (seg: string): { id: string; nodeMatch: boolean; shape: FlowShape; label: string } | null => {
    const s = seg.trim()
    if (!s) return null
    const full = s.match(/^(\w+)\s*(\(\[|\(\(|\[\(|\[\[|\[\/|\{\{|\[|\(|\{)([\s\S]+?)(\]\)|\)\)|\)\]|\]\]|\/\]|\\\]|\}\}|\]|\)|\})\s*$/)
    if (full) {
      let label = full[3]
      if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1)
      label = label.replace(/<br\s*\/?>/gi, '\n')
      return { id: full[1], nodeMatch: true, shape: shapeFromOpener(full[2]), label }
    }
    const bare = s.match(/^(\w+)$/)
    if (bare) return { id: bare[1], nodeMatch: false, shape: 'rect', label: bare[1] }
    return null
  }

  const registerNode = (id: string, label: string, shape: FlowShape, explicit: boolean) => {
    const idx = nodeIndex.get(id)
    if (idx !== undefined) {
      if (explicit) {
        const old = nodes[idx]
        nodes[idx] = { ...old, label, shape }
      }
      addNodeToCurrentGroup(id)
      return
    }
    nodeIndex.set(id, nodes.length)
    nodes.push({ id, label: explicit ? label : id, shape })
    addNodeToCurrentGroup(id)
  }

  for (const raw of lines.slice(1)) {
    const t = raw.trim()
    if (!t || t.startsWith('%')) continue

    const subgraph = parseSubgraphHeader(t)
    if (subgraph) {
      upsertGroup(subgraph.id, subgraph.label, groupStack[groupStack.length - 1])
      groupStack.push(subgraph.id)
      continue
    }
    if (/^end$/i.test(t)) {
      if (groupStack.length) groupStack.pop()
      continue
    }

    // Style line: style N1 fill:#xxx,stroke:#xxx,color:#xxx
    const styleMatch = t.match(/^style\s+(\w+)\s+(.+)$/)
    if (styleMatch) {
      const [, id, rest] = styleMatch
      const idx = nodeIndex.get(id)
      if (idx !== undefined) {
        const node = nodes[idx]
        rest.split(',').forEach((pair) => {
          const [k, v] = pair.split(':').map((s) => s.trim())
          if (k === 'fill') node.fill = v
          else if (k === 'stroke') node.stroke = v
          else if (k === 'color') node.textColor = v
        })
      } else {
        const gidx = groupIndex.get(id)
        if (gidx !== undefined) {
          const group = groups[gidx]
          rest.split(',').forEach((pair) => {
            const [k, v] = pair.split(':').map((s) => s.trim())
            if (k === 'fill') group.fill = v
            else if (k === 'stroke') group.stroke = v
            else if (k === 'color') group.textColor = v
          })
        }
      }
      continue
    }

    const edgeRe = /^(.+?)\s*(-\.->|---?>|-->|==>)\s*(?:\|([^|]*)\|)?\s*(.+)$/
    const em = t.match(edgeRe)
    if (em) {
      const [, fromSeg, rawArrow, pipeLabel, toSeg] = em
      const fromNodes = splitEdgeEndpoints(fromSeg)
        .map(extractNodeFromSegment)
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
      const toNodes = splitEdgeEndpoints(toSeg)
        .map(extractNodeFromSegment)
        .filter((n): n is NonNullable<typeof n> => Boolean(n))

      for (const node of fromNodes) registerNode(node.id, node.label, node.shape, node.nodeMatch)
      for (const node of toNodes) registerNode(node.id, node.label, node.shape, node.nodeMatch)

      if (fromNodes.length && toNodes.length) {
        const style: FlowEdge['style'] =
          rawArrow === '==>' ? '==>' :
          rawArrow.includes('-.') ? '-.->' :
          rawArrow === '--->' ? '--->' : '-->'
        let label = pipeLabel ?? ''
        if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1)
        label = label.replace(/<br\s*\/?>/gi, '\n')
        for (const fromNode of fromNodes) {
          for (const toNode of toNodes) {
            edges.push({ from: fromNode.id, to: toNode.id, label, style })
          }
        }
      }
      continue
    }

    // Standalone node definition (no arrow)
    const nodeOnly = t.match(/^(\w+)\s*(\(\[|\(\(|\[\(|\[\[|\[\/|\{\{|\[|\(|\{)([\s\S]+?)(\]\)|\)\)|\)\]|\]\]|\/\]|\\\]|\}\}|\]|\)|\})/)
    if (nodeOnly) {
      const id    = nodeOnly[1]
      const shape = shapeFromOpener(nodeOnly[2])
      let label = nodeOnly[3]
      if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1)
      label = label.replace(/<br\s*\/?>/gi, '\n')
      registerNode(id, label, shape, true)
    }
  }

  return { direction, nodes, edges, groups }
}

// Escapes a user-entered label so it renders correctly in mermaid.
// Converts newlines into <br/> and wraps in double quotes to allow special chars.
function escapeLabel(label: string): string {
  const text = label
    .replace(/"/g, "'")
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('<br/>')
  return `"${text || ' '}"`
}

function isValidColor(value?: string): boolean {
  return Boolean(value && value.trim())
}

export function buildFlowchart(direction: string, nodes: FlowNode[], edges: FlowEdge[], groups: FlowGroup[] = []): string {
  const lines = [`flowchart ${direction}`]
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const))

  const safeGroups = groups
    .filter((group) => group.id.trim().length > 0)
    .map((group) => ({
      ...group,
      id: group.id.trim(),
      label: (group.label || group.id).trim(),
      nodeIds: Array.from(new Set(group.nodeIds.filter((id) => nodeById.has(id))))
    }))

  const childrenByParent = new Map<string, FlowGroup[]>()
  const roots: FlowGroup[] = []
  for (const group of safeGroups) {
    const parentId = group.parentId && group.parentId !== group.id ? group.parentId : undefined
    if (parentId && safeGroups.some((g) => g.id === parentId)) {
      const arr = childrenByParent.get(parentId) ?? []
      arr.push(group)
      childrenByParent.set(parentId, arr)
    } else {
      roots.push(group)
    }
  }

  const renderNode = (node: FlowNode, indent = '    ') => {
    lines.push(`${indent}${node.id}${SHAPE_OPEN(node.shape)}${escapeLabel(node.label)}${SHAPE_CLOSE(node.shape)}`)
  }

  const renderedNodeIds = new Set<string>()
  const emitGroup = (group: FlowGroup, indent = '    ', seen = new Set<string>()) => {
    if (seen.has(group.id)) return
    seen.add(group.id)
    lines.push(`${indent}subgraph ${group.id}[${escapeLabel(group.label || group.id)}]`)
    const children = childrenByParent.get(group.id) ?? []
    for (const child of children) emitGroup(child, `${indent}    `, new Set(seen))
    for (const nodeId of group.nodeIds) {
      const node = nodeById.get(nodeId)
      if (!node || renderedNodeIds.has(nodeId)) continue
      renderNode(node, `${indent}    `)
      renderedNodeIds.add(nodeId)
    }
    lines.push(`${indent}end`)
  }

  for (const root of roots) emitGroup(root)
  for (const node of nodes) {
    if (renderedNodeIds.has(node.id)) continue
    renderNode(node)
  }

  for (const e of edges) {
    const label = e.label ? `|${escapeLabel(e.label)}|` : ''
    lines.push(`    ${e.from} ${e.style}${label} ${e.to}`)
  }
  // Style directives at the end
  for (const n of nodes) {
    const parts: string[] = []
    if (n.fill) parts.push(`fill:${n.fill}`)
    if (n.stroke) parts.push(`stroke:${n.stroke},stroke-width:2px`)
    if (n.textColor) parts.push(`color:${n.textColor}`)
    if (parts.length) lines.push(`    style ${n.id} ${parts.join(',')}`)
  }
  for (const g of safeGroups) {
    const parts: string[] = []
    if (isValidColor(g.fill)) parts.push(`fill:${g.fill}`)
    if (isValidColor(g.stroke)) parts.push(`stroke:${g.stroke}`)
    if (isValidColor(g.textColor)) parts.push(`color:${g.textColor}`)
    if (parts.length) lines.push(`    style ${g.id} ${parts.join(',')}`)
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
