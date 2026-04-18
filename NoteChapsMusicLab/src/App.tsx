import { useMemo, useState } from 'react'
import {
  HarmonicMode,
  StylePreset,
  DegreeChord,
  buildDiatonicField,
  chordVariants,
  enharmonicEquivalent,
  generateProgression,
  melodyHints,
  parseDegreeFromChord,
  suggestNextChords,
  transposeProgression
} from './lib/harmony'

const STYLE_OPTIONS: Array<{ value: StylePreset; label: string; vibe: string }> = [
  { value: 'pop', label: 'Pop', vibe: 'refrão forte e direto' },
  { value: 'rock', label: 'Rock', vibe: 'energia e ataque' },
  { value: 'sertanejo', label: 'Sertanejo', vibe: 'emoção narrativa' },
  { value: 'mpb', label: 'MPB', vibe: 'harmonia rica e orgânica' },
  { value: 'jazz', label: 'Jazz', vibe: 'tensões e vozes sofisticadas' },
  { value: 'trap', label: 'Trap', vibe: 'clima moderno e escuro' },
  { value: 'lofi', label: 'Lo-fi', vibe: 'textura suave e nostálgica' }
]

const TONICS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

const SHAPE_MAP: Record<string, string[]> = {
  'maj7': ['x-3-2-0-0-0', 'x-10-9-9-8-x', '8-x-9-9-8-x'],
  'm7': ['x-3-1-3-1-x', 'x-7-5-7-5-x', '5-x-5-5-4-x'],
  '7': ['x-3-2-3-1-0', 'x-10-9-10-8-x', '8-x-8-9-8-x'],
  'm7b5': ['x-x-10-10-9-10', 'x-7-8-7-8-x', 'x-x-3-4-3-4'],
  'm9': ['x-3-1-3-3-x', 'x-7-5-7-7-x'],
  'maj9': ['x-3-2-4-3-x', 'x-10-9-11-10-x'],
  'sus4': ['x-3-3-0-1-1', 'x-10-10-10-8-x'],
  'sus2': ['x-3-0-0-1-3', 'x-10-12-12-10-x'],
  '6': ['x-3-2-2-3-x', 'x-10-9-9-10-x'],
  'add9': ['x-3-2-0-3-0', 'x-10-9-7-10-x']
}

function inferShapeKey(chord: string): string {
  const quality = chord.replace(/^([A-G])([#b]?)/, '')
  if (/m7b5/i.test(quality)) return 'm7b5'
  if (/maj9/i.test(quality)) return 'maj9'
  if (/m9/i.test(quality)) return 'm9'
  if (/maj7/i.test(quality)) return 'maj7'
  if (/m7/i.test(quality)) return 'm7'
  if (/sus4/i.test(quality)) return 'sus4'
  if (/sus2/i.test(quality)) return 'sus2'
  if (/add9/i.test(quality)) return 'add9'
  if (/\b6\b/.test(quality)) return '6'
  if (/7/.test(quality)) return '7'
  return 'maj7'
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export default function App() {
  const [tonic, setTonic] = useState('C')
  const [mode, setMode] = useState<HarmonicMode>('major')
  const [style, setStyle] = useState<StylePreset>('pop')
  const [tempo, setTempo] = useState(96)
  const [title, setTitle] = useState('Nova Composição')
  const [lyrics, setLyrics] = useState('Verso 1:\n...')
  const [progression, setProgression] = useState<string[]>(['Cmaj7', 'Am7', 'Fmaj7', 'G7'])
  const [selectedChord, setSelectedChord] = useState('Cmaj7')

  const context = useMemo(() => ({ tonic, mode }), [tonic, mode])
  const field = useMemo(() => buildDiatonicField(context), [context])
  const nextSuggestions = useMemo(() => suggestNextChords(context, progression), [context, progression])

  const melodyPlan = useMemo(() => {
    const degrees = progression
      .map((chord) => parseDegreeFromChord(context, chord))
      .filter((value): value is number => value !== null)
    return melodyHints(context, degrees)
  }, [context, progression])

  const selectedVariants = useMemo(() => {
    const list = chordVariants(selectedChord)
    const enharmonic = enharmonicEquivalent(selectedChord)
    return unique(enharmonic ? [...list, enharmonic] : list)
  }, [selectedChord])

  const shapeKey = inferShapeKey(selectedChord)
  const shapeSuggestions = SHAPE_MAP[shapeKey] ?? ['x-x-x-x-x-x']

  const activeStyle = STYLE_OPTIONS.find((item) => item.value === style)

  const regenerateProgression = () => {
    const next = generateProgression(context, style, 8)
    setProgression(next)
    setSelectedChord(next[0] ?? selectedChord)
  }

  const applyTranspose = (delta: number) => {
    const useFlat = tonic.includes('b')
    const next = transposeProgression(progression, delta, useFlat)
    setProgression(next)
    setSelectedChord(next[0] ?? selectedChord)
  }

  const addChord = (chord: string) => {
    setProgression((prev) => [...prev, chord])
    setSelectedChord(chord)
  }

  return (
    <div className="app-shell">
      <aside className="panel left">
        <h1>NoteChaps Music Lab</h1>
        <p className="sub">Composição assistida por regras de harmonia + matemática musical.</p>

        <label>Título</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />

        <div className="grid two">
          <div>
            <label>Tonalidade</label>
            <select value={tonic} onChange={(event) => setTonic(event.target.value)}>
              {TONICS.map((note) => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Modo</label>
            <select value={mode} onChange={(event) => setMode(event.target.value as HarmonicMode)}>
              <option value="major">Maior</option>
              <option value="minor">Menor</option>
            </select>
          </div>
        </div>

        <div className="grid two">
          <div>
            <label>Estilo</label>
            <select value={style} onChange={(event) => setStyle(event.target.value as StylePreset)}>
              {STYLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>BPM</label>
            <input type="number" value={tempo} onChange={(event) => setTempo(Math.max(40, Math.min(220, Number(event.target.value) || 96)))} />
          </div>
        </div>

        <p className="hint">Vibe atual: <strong>{activeStyle?.vibe}</strong></p>

        <div className="actions">
          <button onClick={regenerateProgression}>Gerar Progressão Inteligente</button>
          <button className="ghost" onClick={() => applyTranspose(-1)}>-1 semitom</button>
          <button className="ghost" onClick={() => applyTranspose(1)}>+1 semitom</button>
        </div>

        <h2>Campo Harmônico</h2>
        <div className="degree-list">
          {field.map((item: DegreeChord) => (
            <button key={item.degree + item.chord} onClick={() => addChord(item.chord)}>
              <span>{item.degree}</span>
              <strong>{item.chord}</strong>
              <small>{item.functionLabel}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="panel center">
        <header className="center-head">
          <div>
            <h2>{title}</h2>
            <p>{tonic} {mode === 'major' ? 'maior' : 'menor'} • {tempo} BPM</p>
          </div>
          <div className="badge">Modo composição</div>
        </header>

        <section>
          <h3>Progressão</h3>
          <div className="chips">
            {progression.map((chord, index) => (
              <button
                key={`${chord}-${index}`}
                className={selectedChord === chord ? 'chip active' : 'chip'}
                onClick={() => setSelectedChord(chord)}
              >
                {chord}
              </button>
            ))}
          </div>

          <h4>Próximos acordes sugeridos</h4>
          <div className="chips compact">
            {nextSuggestions.map((item) => (
              <button key={item} className="chip" onClick={() => addChord(item)}>{item}</button>
            ))}
          </div>
        </section>

        <section>
          <h3>Letra</h3>
          <textarea
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            rows={10}
            placeholder="Escreva a letra aqui e monte em conjunto com os acordes sugeridos..."
          />
        </section>
      </main>

      <aside className="panel right">
        <h2>Assistente Harmônico</h2>

        <section>
          <h3>Acorde selecionado</h3>
          <p className="hero">{selectedChord}</p>
          <p className="hint">Clique nos acordes para alternar variações e explorar sonoridades próximas.</p>

          <h4>Variações reais / equivalentes</h4>
          <div className="chips compact">
            {selectedVariants.map((variant) => (
              <button key={variant} className="chip" onClick={() => setSelectedChord(variant)}>{variant}</button>
            ))}
          </div>
        </section>

        <section>
          <h3>Shapes sugeridos (violão)</h3>
          <ul className="shape-list">
            {shapeSuggestions.map((shape) => (
              <li key={shape}><code>{shape}</code></li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Plano melódico (4, 5, 6, 7)</h3>
          <div className="melody-grid">
            {melodyPlan.map((hint) => (
              <article key={`${hint.note}-${hint.degree}`}>
                <strong>{hint.note}</strong>
                <span>Grau {hint.degree}</span>
                <small>{hint.feeling}</small>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3>Bloco IA (futuro gratuito)</h3>
          <p className="hint">
            Arquitetura pronta para plugar provedor free e usar regras locais como base.
            Próximo passo: ranking de sugestões por contexto da letra + estilo.
          </p>
        </section>
      </aside>
    </div>
  )
}
