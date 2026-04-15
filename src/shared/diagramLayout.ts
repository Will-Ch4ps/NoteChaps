export interface DiagramLayout {
  width: number
  height: number
}

export const DEFAULT_DIAGRAM_LAYOUT: DiagramLayout = Object.freeze({
  width: 100,
  height: 560
})

const META_LINE_REGEX = /^\s*%%\s*notechaps:\s*(.*?)\s*%%\s*$/i
const WIDTH_MIN = 30
const WIDTH_MAX = 100
const HEIGHT_MIN = 220
const HEIGHT_MAX = 1400

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function clampDiagramWidth(value: unknown): number {
  const numeric = toFiniteNumber(value)
  if (numeric === null) return DEFAULT_DIAGRAM_LAYOUT.width
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(numeric)))
}

export function clampDiagramHeight(value: unknown): number {
  const numeric = toFiniteNumber(value)
  if (numeric === null) return DEFAULT_DIAGRAM_LAYOUT.height
  return Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, Math.round(numeric)))
}

export function parseDiagramLayoutMeta(code: string): Partial<DiagramLayout> {
  let width: number | undefined
  let height: number | undefined

  for (const line of code.split('\n')) {
    const match = line.match(META_LINE_REGEX)
    if (!match) continue
    const body = match[1] ?? ''
    const widthMatch = body.match(/\bwidth\s*=\s*(\d+)\b/i)
    const heightMatch = body.match(/\bheight\s*=\s*(\d+)\b/i)
    if (widthMatch) width = clampDiagramWidth(Number(widthMatch[1]))
    if (heightMatch) height = clampDiagramHeight(Number(heightMatch[1]))
  }

  return { width, height }
}

export function stripDiagramLayoutMeta(code: string): string {
  return code
    .split('\n')
    .filter((line) => !META_LINE_REGEX.test(line))
    .join('\n')
}

export function buildDiagramLayoutMeta(layout: Partial<DiagramLayout>): string {
  const width = clampDiagramWidth(layout.width)
  const height = clampDiagramHeight(layout.height)
  return `%% notechaps: width=${width} height=${height} %%`
}

export function resolveDiagramLayout(
  attrs: Partial<DiagramLayout> | null | undefined,
  code: string
): DiagramLayout {
  const parsed = parseDiagramLayoutMeta(code)
  return {
    width: clampDiagramWidth(attrs?.width ?? parsed.width),
    height: clampDiagramHeight(attrs?.height ?? parsed.height)
  }
}
