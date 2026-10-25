import type { BeatPattern } from './types'
import { PRESETS, randomPattern, structuredClonePattern } from './patterns'

const GENRE_KEYWORDS: Array<{ id: string; words: string[] }> = [
  { id: 'lofi', words: ['lofi', 'lo-fi', 'chill', 'rain', 'sleepy', 'study', 'cozy', 'jazzy', 'mellow', 'bus', 'late-night', '2am'] },
  { id: 'trap', words: ['trap', '808', 'dark', 'drill', 'hard', 'menace', 'night', 'midnight', 'boss', 'heavy'] },
  { id: 'house', words: ['house', 'edm', 'dance', 'club', 'techno', 'party', 'energetic', 'workout', 'gym', 'getting ready'] },
  { id: 'pop', words: ['pop', 'happy', 'summer', 'sun', 'radio', 'catchy', 'bright', 'cheerful', 'skate'] },
  { id: 'funk', words: ['funk', 'groove', 'soul', 'retro', 'strut', 'disco', 'roller'] },
  { id: 'hiphop', words: ['hip', 'hop', 'boom bap', 'rap', 'classic', 'old school'] },
]

/**
 * Built-in "vibe library": a genre guess from the prompt's keywords, humanised a
 * little so repeats feel fresh. Used when the AI is unavailable (and offline).
 */
export function fallbackPattern(prompt: string): BeatPattern {
  const lower = prompt.toLowerCase()
  const presetId = GENRE_KEYWORDS.find((g) => g.words.some((w) => lower.includes(w)))?.id ?? null
  const preset = PRESETS.find((p) => p.id === presetId)
  const out = preset ? structuredClonePattern(preset.pattern) : randomPattern(Date.now())
  if (preset) {
    for (let s = 1; s < 16; s += 2) {
      if (Math.random() < 0.15) out.drums.hihat[s] = true
    }
    if (Math.random() < 0.3) {
      const r = Math.floor(Math.random() * 6)
      const s = [3, 6, 11, 14][Math.floor(Math.random() * 4)]
      out.bass[r][s] = true
    }
  }
  return out
}

/** Instructions for any model that writes a beat pattern (server AI and in-page Claude). */
export const BEAT_PROMPT = `You are a beat-pattern generator for a 16-step sequencer (one bar of 16th notes).
Respond with ONLY valid JSON — no markdown fences, no commentary — matching exactly:
{"bpm": <int 60-180>, "swing": <number 0-0.5>, "kick": [16 booleans], "snare": [16 booleans], "hihat": [16 booleans], "clap": [16 booleans], "bass": [6 rows x 16 booleans], "melody": [8 rows x 16 booleans]}

Pitch rows go LOW to HIGH (row 0 = lowest):
- bass rows: C2, D#2, F2, G2, A#2, C3
- melody rows: C4, D#4, F4, G4, A#4, C5, D#5, F5 (C minor pentatonic)

Rules for a musical result:
- kick almost always hits step 0
- snare and/or clap usually on steps 4 and 12 (half-time: only step 8)
- hihat drives the groove; add rolls for trap energy
- keep bass 3-6 notes, melody 3-7 notes — sparse and catchy, never every step
- match the requested vibe, tempo and energy
Example shape (do not copy content): {"bpm":90,"swing":0.14,"kick":[1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"hihat":[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],"clap":[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],"bass":[[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],"melody":[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]}`
