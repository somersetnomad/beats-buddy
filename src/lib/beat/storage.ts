import type { SavedBeat } from './types'

const KEY = 'beatbuddy.library.v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadLibrary(): SavedBeat[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((b) => b && typeof b.id === 'string' && typeof b.name === 'string' && b.pattern)
  } catch {
    return []
  }
}

function persist(beats: SavedBeat[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(beats))
  } catch {
    // storage full — fail silently, the UI still works in-session
  }
}

export function saveBeat(input: { id?: string | null; name: string; prompt?: string; pattern: SavedBeat['pattern'] }): SavedBeat {
  const beats = loadLibrary()
  const now = Date.now()
  const existingIdx = input.id ? beats.findIndex((b) => b.id === input.id) : -1

  if (existingIdx >= 0) {
    const updated: SavedBeat = { ...beats[existingIdx], name: input.name, prompt: input.prompt, pattern: input.pattern, createdAt: now }
    beats[existingIdx] = updated
    persist(beats)
    return updated
  }

  const beat: SavedBeat = {
    id: `beat_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    prompt: input.prompt,
    createdAt: now,
    pattern: input.pattern,
  }
  beats.unshift(beat)
  persist(beats)
  return beat
}

export function deleteBeat(id: string): SavedBeat[] {
  const beats = loadLibrary().filter((b) => b.id !== id)
  persist(beats)
  return beats
}

export function renameBeat(id: string, name: string): SavedBeat[] {
  const beats = loadLibrary().map((b) => (b.id === id ? { ...b, name } : b))
  persist(beats)
  return beats
}
