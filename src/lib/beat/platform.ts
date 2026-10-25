'use client'

import type { BeatPattern } from './types'
import { sanitizePattern } from './patterns'
import { BEAT_PROMPT, fallbackPattern } from './vibes'

/**
 * Where BeatBuddy runs decides how AI and file saving work:
 * - inside a Claude artifact viewer: `window.claude.use('sample')` writes beats with the
 *   viewer's Claude, and `use('downloads')` hands them files (zip, since .wav isn't allowed);
 * - as a normal Next.js deploy: the /api/generate route and a plain browser download.
 * Either way the built-in vibe library is the last resort, so a beat always comes back.
 */

type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: <T = unknown>(input: string, opts?: Record<string, unknown>) => Promise<T>
}
type Downloads = { save: (req: { filename: string; data: Blob | ArrayBuffer | string }) => Promise<{ status: string }> }
type ClaudeRuntime = { use: (name: string) => Promise<unknown> }

function runtime(): ClaudeRuntime | null {
  if (typeof window === 'undefined') return null
  const c = (window as unknown as { claude?: ClaudeRuntime }).claude
  return c && typeof c.use === 'function' ? c : null
}

const cache: Record<string, Promise<unknown>> = {}
function capability<T>(name: string): Promise<T | null> {
  const rt = runtime()
  if (!rt) return Promise.resolve(null)
  cache[name] ??= rt.use(name).catch(() => null)
  return cache[name] as Promise<T | null>
}

export const isArtifactHost = () => runtime() !== null

export type GenerateResult = { pattern: BeatPattern; source: 'ai' | 'fallback'; reason?: string }

const SAMPLE_BLOCKED = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'])
let sampleBlocked = false

export async function generateBeat(prompt: string, signal?: AbortSignal): Promise<GenerateResult> {
  // 1) Claude, from inside the artifact viewer
  const sample = sampleBlocked ? null : await capability<SampleFn>('sample')
  if (sample) {
    try {
      const raw = await sample.json(
        `${BEAT_PROMPT}\n\nVibe: "${prompt.replace(/"/g, "'")}". Reply with only the JSON object for this beat.`,
        { modelTier: 'quick', cache: false, signal },
      )
      return { pattern: sanitizePattern(raw, fallbackPattern(prompt)), source: 'ai' }
    } catch (e) {
      const code = (e as { code?: string })?.code ?? 'upstream_error'
      if (code === 'cancelled') throw e
      if (SAMPLE_BLOCKED.has(code)) sampleBlocked = true
      return { pattern: fallbackPattern(prompt), source: 'fallback', reason: code }
    }
  }

  // 2) our own server route (normal deploys)
  if (!isArtifactHost() && process.env.NEXT_PUBLIC_BB_PREVIEW !== '1') {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal,
      })
      const data = await res.json().catch(() => null)
      if (res.status === 400 && data?.error) throw new Error(data.error)
      if (data?.pattern) return { pattern: data.pattern as BeatPattern, source: data.source === 'ai' ? 'ai' : 'fallback' }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e
      if (e instanceof Error && e.message && !/fetch|network|JSON/i.test(e.message)) throw e
    }
  }

  // 3) offline vibe library
  await new Promise((r) => setTimeout(r, 700))
  return { pattern: fallbackPattern(prompt), source: 'fallback', reason: 'offline' }
}

export type SaveOutcome = 'saved' | 'declined' | 'unavailable'

/** Save a WAV for the viewer. Inside the artifact viewer it travels inside a .zip. */
export async function saveWav(wav: Blob, baseName: string): Promise<{ outcome: SaveOutcome; zipped: boolean }> {
  const safe = (baseName.trim() || 'beatbuddy').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60)
  if (isArtifactHost()) {
    const downloads = await capability<Downloads>('downloads')
    if (!downloads) return { outcome: 'unavailable', zipped: true }
    const zip = await zipStore([{ name: `${safe}.wav`, data: new Uint8Array(await wav.arrayBuffer()) }])
    try {
      await downloads.save({ filename: `${safe}.zip`, data: zip })
      return { outcome: 'saved', zipped: true }
    } catch (e) {
      const code = (e as { code?: string })?.code
      return { outcome: code === 'declined' ? 'declined' : 'unavailable', zipped: true }
    }
  }
  const url = URL.createObjectURL(wav)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe}.wav`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return { outcome: 'saved', zipped: false }
}

// ------------------------------------------------------------------ minimal ZIP (stored, no compression)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export async function zipStore(files: Array<{ name: string; data: Uint8Array }>): Promise<Blob> {
  const enc = new TextEncoder()
  const parts: BlobPart[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, dosTime, true)
    local.setUint16(12, dosDate, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, f.data.length, true)
    local.setUint32(22, f.data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, f.data as BlobPart)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, dosTime, true)
    cd.setUint16(14, dosDate, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, f.data.length, true)
    cd.setUint32(24, f.data.length, true)
    cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    const entry = new Uint8Array(46 + name.length)
    entry.set(new Uint8Array(cd.buffer), 0)
    entry.set(name, 46)
    central.push(entry)
    offset += 30 + name.length + f.data.length
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...(central as BlobPart[]), end.buffer], { type: 'application/zip' })
}
