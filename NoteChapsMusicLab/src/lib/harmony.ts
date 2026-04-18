export type HarmonicMode = 'major' | 'minor'
export type StylePreset = 'pop' | 'rock' | 'sertanejo' | 'mpb' | 'jazz' | 'trap' | 'lofi'

export interface HarmonicContext {
  tonic: string
  mode: HarmonicMode
}

export interface DegreeChord {
  degree: string
  chord: string
  functionLabel: string
  feeling: string
}

export interface MelodyHint {
  note: string
  degree: string
  feeling: string
}

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11
}

const MODE_OFFSETS: Record<HarmonicMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10]
}

const MAJOR_QUALITIES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5']
const MINOR_QUALITIES = ['m7', 'm7b5', 'maj7', 'm7', '7', 'maj7', '7']

const MAJOR_FUNCTIONS = [
  { degree: 'I', functionLabel: 'Tônica', feeling: 'base, repouso e clareza' },
  { degree: 'ii', functionLabel: 'Predominante', feeling: 'movimento leve' },
  { degree: 'iii', functionLabel: 'Cor', feeling: 'coloração emocional' },
  { degree: 'IV', functionLabel: 'Subdominante', feeling: 'abertura e expansão' },
  { degree: 'V', functionLabel: 'Dominante', feeling: 'tensão que pede resolução' },
  { degree: 'vi', functionLabel: 'Relativo menor', feeling: 'nostalgia e profundidade' },
  { degree: 'vii°', functionLabel: 'Sensível', feeling: 'instabilidade e suspense' }
]

const MINOR_FUNCTIONS = [
  { degree: 'i', functionLabel: 'Tônica menor', feeling: 'centro emocional' },
  { degree: 'ii°', functionLabel: 'Predominante tenso', feeling: 'suspense e expectativa' },
  { degree: 'III', functionLabel: 'Contraste', feeling: 'respiro e brilho' },
  { degree: 'iv', functionLabel: 'Subdominante menor', feeling: 'drama e profundidade' },
  { degree: 'V', functionLabel: 'Dominante', feeling: 'força de resolução' },
  { degree: 'VI', functionLabel: 'Cor épica', feeling: 'sensação cinematográfica' },
  { degree: 'VII', functionLabel: 'Pré-resolução', feeling: 'empurra para o centro' }
]

const STYLE_PATTERNS: Record<StylePreset, number[][]> = {
  pop: [[1, 5, 6, 4], [1, 6, 4, 5]],
  rock: [[1, 4, 5, 1], [6, 4, 1, 5]],
  sertanejo: [[1, 5, 6, 4], [1, 4, 6, 5]],
  mpb: [[1, 3, 6, 2, 5], [1, 6, 2, 5]],
  jazz: [[2, 5, 1, 6], [3, 6, 2, 5, 1]],
  trap: [[6, 4, 1, 5], [1, 6, 7, 5]],
  lofi: [[1, 7, 6, 5], [4, 5, 3, 6]]
}

const DEGREE_TRANSITIONS: Record<number, number[]> = {
  1: [4, 5, 6, 3],
  2: [5, 7, 1],
  3: [6, 4, 2],
  4: [2, 5, 1],
  5: [1, 6, 4],
  6: [2, 4, 5, 1],
  7: [1, 3, 6]
}

export function normalizeTonic(tonic: string): string {
  const trimmed = tonic.trim()
  if (!trimmed) return 'C'
  if (NOTE_INDEX[trimmed] === undefined) return 'C'
  return trimmed
}

export function toSemitone(note: string): number {
  return NOTE_INDEX[normalizeTonic(note)] ?? 0
}

export function noteFromSemitone(semitone: number, preferFlat = false): string {
  const index = ((semitone % 12) + 12) % 12
  return preferFlat ? FLAT_NOTES[index] : SHARP_NOTES[index]
}

export function buildScale(context: HarmonicContext): string[] {
  const tonic = toSemitone(context.tonic)
  const preferFlat = context.tonic.includes('b')
  return MODE_OFFSETS[context.mode].map((offset) => noteFromSemitone(tonic + offset, preferFlat))
}

export function buildDiatonicField(context: HarmonicContext): DegreeChord[] {
  const scale = buildScale(context)
  const qualities = context.mode === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES
  const functions = context.mode === 'major' ? MAJOR_FUNCTIONS : MINOR_FUNCTIONS

  return scale.map((note, index) => ({
    degree: functions[index].degree,
    chord: `${note}${qualities[index]}`,
    functionLabel: functions[index].functionLabel,
    feeling: functions[index].feeling
  }))
}

function chordFromDegree(context: HarmonicContext, degree: number): string {
  const field = buildDiatonicField(context)
  const safeDegree = Math.max(1, Math.min(7, degree))
  return field[safeDegree - 1].chord
}

export function generateProgression(context: HarmonicContext, style: StylePreset, length = 8): string[] {
  const patterns = STYLE_PATTERNS[style]
  const picked = patterns[Math.floor(Math.random() * patterns.length)]
  const progression: string[] = []

  while (progression.length < Math.max(4, length)) {
    for (const degree of picked) {
      progression.push(chordFromDegree(context, degree))
      if (progression.length >= Math.max(4, length)) break
    }
  }

  return progression
}

export function suggestNextChords(context: HarmonicContext, progression: string[]): string[] {
  if (progression.length === 0) {
    return [1, 4, 5, 6].map((degree) => chordFromDegree(context, degree))
  }

  const field = buildDiatonicField(context)
  const lastChord = progression[progression.length - 1]
  const idx = field.findIndex((item) => lastChord.startsWith(item.chord.replace(/(maj7|m7b5|m7|7)$/i, '')))
  const lastDegree = idx >= 0 ? idx + 1 : 1
  const candidates = DEGREE_TRANSITIONS[lastDegree] ?? [1, 4, 5]

  return candidates.map((degree) => chordFromDegree(context, degree))
}

export function transposeProgression(progression: string[], semitones: number, preferFlat = false): string[] {
  if (!semitones) return progression
  return progression.map((chord) => {
    const match = chord.match(/^([A-G])([#b]?)(.*)$/)
    if (!match) return chord
    const root = `${match[1]}${match[2] ?? ''}`
    const quality = match[3] ?? ''
    const transposed = noteFromSemitone(toSemitone(root) + semitones, preferFlat)
    return `${transposed}${quality}`
  })
}

export function chordVariants(chord: string): string[] {
  const match = chord.match(/^([A-G])([#b]?)(.*)$/)
  if (!match) return [chord]
  const root = `${match[1]}${match[2] ?? ''}`
  const quality = match[3] ?? ''

  const variants = new Set<string>()
  variants.add(`${root}${quality}`)

  if (/m7b5/i.test(quality)) {
    variants.add(`${root}dim7`)
    variants.add(`${root}m7b5(11)`)
  } else if (/maj7/i.test(quality)) {
    variants.add(`${root}maj9`)
    variants.add(`${root}6/9`)
    variants.add(`${root}maj7(11)`)
  } else if (/m7/i.test(quality)) {
    variants.add(`${root}m9`)
    variants.add(`${root}m11`)
    variants.add(`${root}m6`)
  } else if (/7/i.test(quality)) {
    variants.add(`${root}9`)
    variants.add(`${root}13`)
    variants.add(`${root}7sus4`)
  } else {
    variants.add(`${root}add9`)
    variants.add(`${root}6`)
    variants.add(`${root}sus2`)
    variants.add(`${root}sus4`)
  }

  const enh = enharmonicEquivalent(root)
  if (enh) variants.add(`${enh}${quality}`)

  return Array.from(variants)
}

export function enharmonicEquivalent(noteOrChord: string): string | null {
  const match = noteOrChord.match(/^([A-G])([#b]?)(.*)$/)
  if (!match) return null
  const root = `${match[1]}${match[2] ?? ''}`
  const suffix = match[3] ?? ''
  const semitone = toSemitone(root)
  const sharp = noteFromSemitone(semitone, false)
  const flat = noteFromSemitone(semitone, true)
  if (sharp === flat) return null
  const alt = root === sharp ? flat : sharp
  return `${alt}${suffix}`
}

export function melodyHints(context: HarmonicContext, previousDegrees: number[]): MelodyHint[] {
  const scale = buildScale(context)
  const labels = context.mode === 'major'
    ? ['1', '2', '3', '4', '5', '6', '7']
    : ['1', '2', 'b3', '4', '5', 'b6', 'b7']

  const lastDegree = previousDegrees.length ? previousDegrees[previousDegrees.length - 1] : 1
  const plan = [lastDegree, ((lastDegree + 1) % 7) + 1, ((lastDegree + 3) % 7) + 1, 5, 4, 6, 7]
  const unique = Array.from(new Set(plan)).slice(0, 5)

  return unique.map((degree) => {
    const idx = Math.max(1, Math.min(7, degree)) - 1
    const feeling =
      idx === 3 ? 'abertura e suspensao' :
      idx === 4 ? 'forca dominante' :
      idx === 5 ? 'emoção e calor' :
      idx === 6 ? 'tensao pronta para resolver' :
      idx === 0 ? 'repouso' :
      'movimento'

    return {
      note: scale[idx],
      degree: labels[idx],
      feeling
    }
  })
}

export function parseDegreeFromChord(context: HarmonicContext, chord: string): number | null {
  const field = buildDiatonicField(context)
  const match = chord.match(/^([A-G])([#b]?)/)
  if (!match) return null
  const root = `${match[1]}${match[2] ?? ''}`
  const index = field.findIndex((item) => item.chord.startsWith(root))
  return index >= 0 ? index + 1 : null
}
