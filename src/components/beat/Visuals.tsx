'use client'

import { useEffect, useRef } from 'react'
import type { BeatPattern, TrackId } from '@/lib/beat/types'
import { ALL_TRACKS, DRUM_TRACKS, STEPS, TRACK_META } from '@/lib/beat/types'

/** Collapse a pattern into 6 rows x 16 steps: one row per track. */
export function patternRows(p: BeatPattern): Array<{ id: TrackId; steps: boolean[] }> {
  return ALL_TRACKS.map((id) => {
    if ((DRUM_TRACKS as string[]).includes(id)) return { id, steps: p.drums[id as 'kick'] }
    const rows = id === 'bass' ? p.bass : p.melody
    return { id, steps: Array.from({ length: STEPS }, (_, s) => rows.some((r) => r[s])) }
  })
}

/** A glowing thumbnail of a beat — the "cover art" for presets and saved beats. */
export function MiniPattern({ pattern, step = -1, className = '' }: { pattern: BeatPattern; step?: number; className?: string }) {
  const rows = patternRows(pattern)
  return (
    <div className={`grid gap-[3px] ${className}`} style={{ gridTemplateColumns: `repeat(${STEPS}, 1fr)` }} aria-hidden>
      {rows.flatMap(({ id, steps }) =>
        steps.map((on, s) => {
          const c = TRACK_META[id].color
          const hit = on && s === step
          return (
            <span
              key={`${id}-${s}`}
              className="aspect-square rounded-[3px] transition-[transform,box-shadow,background-color] duration-100"
              style={
                on
                  ? {
                      background: c,
                      boxShadow: hit ? `0 0 10px 2px ${c}, 0 0 2px #fff inset` : `0 0 6px ${c}`,
                      transform: hit ? 'scale(1.35)' : undefined,
                      filter: hit ? 'brightness(1.5)' : undefined,
                    }
                  : { background: s === step ? 'rgba(255,255,255,.22)' : 'rgba(185,178,232,.09)' }
              }
            />
          )
        })
      )}
    </div>
  )
}

/**
 * Live spectrum. Reads the engine's analyser while music plays; otherwise draws a
 * slow idle shimmer so the stage never looks switched off.
 */
export function Spectrum({ analyser, playing, className = '', bars = 48 }: { analyser: AnalyserNode | null; playing: boolean; className?: string; bars?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const levels = useRef<Float32Array>(new Float32Array(bars))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 256)
    let raf = 0
    let t = 0
    if (levels.current.length !== bars) levels.current = new Float32Array(bars)

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const r = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(r.width * dpr))
      canvas.height = Math.max(1, Math.floor(r.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const colors = ['#FF4D6D', '#FF9F1C', '#F9F871', '#2DF5C4', '#8B5CFF', '#FF5CD6']

    const draw = () => {
      t += 1
      const w = canvas.width
      const h = canvas.height
      ctx2d.clearRect(0, 0, w, h)
      if (playing && analyser) analyser.getByteFrequencyData(data)
      const grad = ctx2d.createLinearGradient(0, 0, w, 0)
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))

      const gap = w / bars
      const bw = Math.max(2, gap * 0.56)
      for (let i = 0; i < bars; i++) {
        let target: number
        if (playing && analyser) {
          // log-ish mapping so lows don't hog the whole strip
          const idx = Math.min(data.length - 1, Math.floor(Math.pow(i / bars, 1.6) * data.length * 0.72))
          target = data[idx] / 255
        } else {
          target = reduce ? 0.08 : 0.06 + 0.05 * (1 + Math.sin(t / 28 + i * 0.45)) * (0.5 + 0.5 * Math.sin(t / 90 + i * 0.12))
        }
        const prev = levels.current[i]
        levels.current[i] = target > prev ? prev + (target - prev) * 0.55 : prev + (target - prev) * 0.12
        const v = levels.current[i]
        const bh = Math.max(bw, v * h * 0.92)
        const x = i * gap + (gap - bw) / 2
        const y = (h - bh) / 2
        ctx2d.fillStyle = grad
        ctx2d.shadowColor = colors[Math.floor((i / bars) * colors.length) % colors.length]
        ctx2d.shadowBlur = 6 + v * 22
        ctx2d.globalAlpha = 0.35 + v * 0.65
        ctx2d.beginPath()
        const rr = bw / 2
        ctx2d.roundRect(x, y, bw, bh, rr)
        ctx2d.fill()
      }
      ctx2d.globalAlpha = 1
      if (!reduce || playing) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [analyser, playing, bars])

  return <canvas ref={canvasRef} className={`block w-full ${className}`} aria-hidden />
}
