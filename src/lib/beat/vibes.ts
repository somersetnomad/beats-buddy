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
