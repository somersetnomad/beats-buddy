import type { BeatPattern, DrumTrackId, SavedBeat, TrackId } from './types'
import { BASS_ROWS, DRUM_TRACKS, MELODY_ROWS, PITCH_TRACKS, STEPS, ALL_TRACKS } from './types'

export interface Preset {
  id: string
  label: string
  emoji: string
  blurb: string
  gradient: string
  pattern: BeatPattern
}

function buildPattern(
  bpm: number,
  swing: number,
  drumMap: Partial<Record<DrumTrackId, number[]>>,
  bassNotes: Array<[row: number, step: number]>,
  melodyNotes: Array<[row: number, step: number]>
): BeatPattern {
  const drums = {} as Record<DrumTrackId, boolean[]>
  for (const id of DRUM_TRACKS) {
    const on = new Set(drumMap[id] ?? [])
    drums[id] = Array.from({ length: STEPS }, (_, s) => on.has(s))
  }
  const bass = emptyRows(BASS_ROWS)
  for (const [row, step] of bassNotes) if (row >= 0 && row < BASS_ROWS && step >= 0 && step < STEPS) bass[row][step] = true
  const melody = emptyRows(MELODY_ROWS)
  for (const [row, step] of melodyNotes) if (row >= 0 && row < MELODY_ROWS && step >= 0 && step < STEPS) melody[row][step] = true

  return {
    bpm,
    swing,
    drums,
    bass,
    melody,
    volumes: { kick: 0.9, snare: 0.75, hihat: 0.55, clap: 0.7, bass: 0.8, melody: 0.7 },
    muted: { kick: false, snare: false, hihat: false, clap: false, bass: false, melody: false },
  }
}

function emptyRows(rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: STEPS }, () => false))
}

export function createEmptyPattern(): BeatPattern {
  return buildPattern(100, 0.1, {}, [], [])
}

/**
 * What the studio opens with: a complete, head-nodding groove on every track, so the
 * first thing anyone hears is good. Bass rows 0-5 = C2..C3, melody rows 0-7 = C4..F5.
 */
export function createStarterPattern(): BeatPattern {
  return buildPattern(
    96, 0.18,
    {
      kick: [0, 3, 8, 10],
      snare: [4, 12],
      hihat: [0, 2, 4, 6, 8, 10, 12, 14, 15],
      clap: [12],
    },
    [[0, 0], [0, 3], [3, 8], [2, 10], [4, 14]],
    [[5, 0], [4, 2], [3, 4], [5, 7], [6, 8], [4, 10], [3, 12], [2, 14]]
  )
}

// ---------------------------------------------------------------- presets

export const PRESETS: Preset[] = [
  {
    id: 'hiphop',
    label: 'Hip-Hop',
    emoji: '🎤',
    blurb: 'Boom-bap head-nodder',
    gradient: 'linear-gradient(135deg, #FF4D6D, #FF9F1C)',
    pattern: buildPattern(
      90, 0.14,
      { kick: [0, 7, 10], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [12] },
      [[0, 0], [4, 7], [0, 10]],
      [[5, 0], [3, 4], [2, 10]]
    ),
  },
  {
    id: 'lofi',
    label: 'Lo-Fi',
    emoji: '🌧️',
    blurb: 'Rainy-day chill loop',
    gradient: 'linear-gradient(135deg, #8B5CFF, #FF5CD6)',
    pattern: buildPattern(
      76, 0.32,
      { kick: [0, 10], snare: [4, 12], hihat: [0, 3, 6, 9, 12, 14] },
      [[0, 0], [2, 7], [1, 10]],
      [[6, 2], [4, 6], [5, 12], [3, 14]]
    ),
  },
  {
    id: 'house',
    label: 'House',
    emoji: '🪩',
    blurb: 'Four-on-the-floor banger',
    gradient: 'linear-gradient(135deg, #2DF5C4, #8B5CFF)',
    pattern: buildPattern(
      124, 0,
      { kick: [0, 4, 8, 12], clap: [4, 12], hihat: [2, 6, 10, 14] },
      [[0, 2], [0, 6], [0, 10], [2, 14]],
      [[5, 4], [4, 7], [5, 12], [6, 15]]
    ),
  },
  {
    id: 'pop',
    label: 'Pop',
    emoji: '☀️',
    blurb: 'Sunshine radio hook',
    gradient: 'linear-gradient(135deg, #FF9F1C, #FF5CD6)',
    pattern: buildPattern(
      108, 0.08,
      { kick: [0, 8, 10], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [4, 12] },
      [[0, 0], [0, 3], [3, 8], [0, 11], [2, 14]],
      [[5, 0], [4, 2], [3, 4], [5, 8], [6, 12], [4, 14]]
    ),
  },
  {
    id: 'trap',
    label: 'Trap',
    emoji: '🐍',
    blurb: '808s and hat rolls',
    gradient: 'linear-gradient(135deg, #2DF5C4, #0EA5E9)',
    pattern: buildPattern(
      140, 0,
      { kick: [0, 6, 10], clap: [8], hihat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15] },
      [[0, 0], [0, 6], [2, 10]],
      [[1, 0], [2, 8], [4, 12]]
    ),
  },
  {
    id: 'funk',
    label: 'Funk',
    emoji: '🕺',
    blurb: 'Basslines with attitude',
    gradient: 'linear-gradient(135deg, #FF5CD6, #F9F871)',
    pattern: buildPattern(
      104, 0.16,
      { kick: [0, 3, 6, 10], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14] },
      [[0, 0], [0, 3], [5, 6], [3, 8], [0, 11], [4, 14]],
      [[4, 2], [5, 6], [3, 10], [6, 13]]
    ),
  },
]

// ---------------------------------------------------------------- random

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]
}

/** Mulberry32 seeded PRNG so "Random" feels fun but reproducible-ish */
export function randomPattern(seed = Date.now()): BeatPattern {
  let a = seed >>> 0
  const rnd = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const base = pick(PRESETS, rnd).pattern
  const p = structuredClonePattern(base)

  // kick: always step 0, sprinkle 1-3 more
  const kickHits = new Set<number>([0])
  const kickCandidates = [3, 6, 7, 8, 10, 11, 14]
  const kickCount = 1 + Math.floor(rnd() * 3)
  while (kickHits.size < kickCount + 1) kickHits.add(pick(kickCandidates, rnd))
  p.drums.kick = Array.from({ length: STEPS }, (_, s) => kickHits.has(s))

  // snare/clap backbeat
  const halfTime = rnd() < 0.25
  const snareSteps = halfTime ? [8] : [4, 12]
  p.drums.snare = Array.from({ length: STEPS }, (_, s) => snareSteps.includes(s))
  p.drums.clap = Array.from({ length: STEPS }, (_, s) => !halfTime && s === 12)

  // hats
  const hatSteps = new Set<number>()
  for (let s = 0; s < STEPS; s += 2) hatSteps.add(s)
  for (const s of [1, 3, 5, 7, 9, 11, 13, 15]) if (rnd() < 0.3) hatSteps.add(s)
  p.drums.hihat = Array.from({ length: STEPS }, (_, s) => hatSteps.has(s))

  // bass: 3-5 notes on groovy steps, low rows
  const bass = emptyRows(BASS_ROWS)
  const bassSteps = [0, 3, 6, 7, 8, 10, 11, 14]
  const bassCount = 3 + Math.floor(rnd() * 3)
  for (let i = 0; i < bassCount; i++) {
    const row = Math.floor(rnd() * 3) // keep it low
    bass[row][pick(bassSteps, rnd)] = true
  }
  p.bass = bass

  // melody: 3-6 sparse notes, upper rows
  const melody = emptyRows(MELODY_ROWS)
  const melCount = 3 + Math.floor(rnd() * 4)
  for (let i = 0; i < melCount; i++) {
    const row = 2 + Math.floor(rnd() * (MELODY_ROWS - 2))
    melody[row][pick([0, 2, 4, 6, 7, 8, 10, 12, 14, 15], rnd)] = true
  }
  p.melody = melody

  p.bpm = 70 + Math.floor(rnd() * 70)
  p.swing = Math.round(rnd() * 30) / 100
  return p
}

// ---------------------------------------------------------------- sanitize (for AI output)

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true'
}

function coerceSteps(v: unknown, fallback: boolean[]): boolean[] {
  if (!Array.isArray(v)) return fallback
  const out = Array.from({ length: STEPS }, (_, i) => toBool(v[i]))
  return out.some(Boolean) ? out : fallback
}

function coerceRows(v: unknown, rows: number, fallback: boolean[][]): boolean[][] {
  if (!Array.isArray(v)) return fallback
  const out: boolean[][] = []
  for (let r = 0; r < rows; r++) out.push(coerceSteps(v[r], fallback[r] ?? emptyRows(1)[0]))
  return out.some((row) => row.some(Boolean)) ? out : fallback
}

/** Hard-validates anything an LLM (or user) throws at us into a safe BeatPattern. */
export function sanitizePattern(raw: unknown, fallback: BeatPattern): BeatPattern {
  if (typeof raw !== 'object' || raw === null) return fallback
  const r = raw as Record<string, unknown>

  const num = (v: unknown, min: number, max: number, dflt: number) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt
  }

  const drums = {} as Record<DrumTrackId, boolean[]>
  for (const id of DRUM_TRACKS) drums[id] = coerceSteps(r[id], fallback.drums[id])

  const bass = coerceRows(r.bass, BASS_ROWS, fallback.bass)
  const melody = coerceRows(r.melody, MELODY_ROWS, fallback.melody)

  const empty =
    !DRUM_TRACKS.some((id) => drums[id].some(Boolean)) &&
    !bass.some((row) => row.some(Boolean)) &&
    !melody.some((row) => row.some(Boolean))
  if (empty) return fallback

  const volumes = { ...fallback.volumes }
  const muted = { ...fallback.muted }
  if (typeof r.volumes === 'object' && r.volumes !== null) {
    const v = r.volumes as Record<string, unknown>
    for (const id of ALL_TRACKS as TrackId[]) volumes[id] = num(v[id], 0, 1, volumes[id])
  }

  return { bpm: num(r.bpm, 60, 180, fallback.bpm), swing: num(r.swing, 0, 0.5, fallback.swing), drums, bass, melody, volumes, muted }
}

export function structuredClonePattern(p: BeatPattern): BeatPattern {
  return {
    bpm: p.bpm,
    swing: p.swing,
    drums: { kick: [...p.drums.kick], snare: [...p.drums.snare], hihat: [...p.drums.hihat], clap: [...p.drums.clap] },
    bass: p.bass.map((r) => [...r]),
    melody: p.melody.map((r) => [...r]),
    volumes: { ...p.volumes },
    muted: { ...p.muted },
  }
}

export function isEmptyPattern(p: BeatPattern): boolean {
  return (
    !PITCH_TRACKS.some((t) => p[t].some((row) => row.some(Boolean))) &&
    !DRUM_TRACKS.some((t) => p.drums[t].some(Boolean))
  )
}

export { PITCH_TRACKS }
export type { SavedBeat }
