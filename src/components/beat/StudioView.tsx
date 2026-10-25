'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StepGrid from './StepGrid'
import { Spectrum } from './Visuals'
import { TRACK_META, ALL_TRACKS, DRUM_TRACKS } from '@/lib/beat/types'
import type { BeatPattern, DrumTrackId, PitchTrackId, TrackId } from '@/lib/beat/types'
import { originOf } from '@/lib/beat/fx'
import { Download, Eraser, Volume2, VolumeX, Save, Shuffle, Square, Play, Wand2 } from 'lucide-react'

type Origin = { x: number; y: number } | undefined

interface StudioViewProps {
  pattern: BeatPattern
  currentStep: number
  playing: boolean
  analyser: AnalyserNode | null
  exporting: boolean
  aiLoading: boolean
  aiNotice: string | null
  beatName: string
  promptInput: string
  setPromptInput: (v: string) => void
  setBeatName: (v: string) => void
  onTogglePlay: () => void
  onBpmChange: (bpm: number) => void
  onSwingChange: (swing: number) => void
  onToggleDrum: (track: DrumTrackId, step: number) => void
  onTogglePitch: (track: PitchTrackId, row: number, step: number) => void
  onPreviewTrack: (track: DrumTrackId | PitchTrackId, row?: number) => void
  onToggleMute: (track: TrackId) => void
  onVolumeChange: (track: TrackId, vol: number) => void
  onRandomize: () => void
  onClear: () => void
  onGenerate: (origin?: Origin) => void
  onSave: (origin?: Origin) => void
  onExport: () => void
  shouldFocusAi: boolean
}

const AI_CHIPS = ['lo-fi chill with rain', 'dark trap at midnight', 'sunny summer pop', 'gym session EDM', 'old school boom bap', 'funky disco groove']

const COOKING = ['Listening to your vibe', 'Laying down the kick', 'Finding the bassline', 'Writing a melody', 'Adding the sparkle']

const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`

function hitsAt(p: BeatPattern, id: TrackId, step: number): boolean {
  if (step < 0 || p.muted[id]) return false
  if ((DRUM_TRACKS as string[]).includes(id)) return p.drums[id as DrumTrackId][step]
  return (id === 'bass' ? p.bass : p.melody).some((r) => r[step])
}

export default function StudioView(props: StudioViewProps) {
  const { pattern, currentStep, playing, exporting, aiLoading, aiNotice, beatName, promptInput, setPromptInput } = props
  const aiInputRef = useRef<HTMLInputElement | null>(null)
  const aiPanelRef = useRef<HTMLElement | null>(null)
  const [cookIdx, setCookIdx] = useState(0)

  useEffect(() => {
    if (props.shouldFocusAi) {
      aiInputRef.current?.focus()
      aiInputRef.current?.select()
    }
  }, [props.shouldFocusAi])

  useEffect(() => {
    if (!aiLoading) return
    const t = setInterval(() => setCookIdx((i) => Math.min(COOKING.length - 1, i + 1)), 1600)
    return () => {
      clearInterval(t)
      setCookIdx(0)
    }
  }, [aiLoading])

  const swingPct = Math.round(pattern.swing * 100)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10">
      {/* ------------------------------------------------ name, save, export */}
      <section className="pt-8 flex flex-wrap items-center gap-3" aria-label="Beat details">
        <input
          value={beatName}
          onChange={(e) => props.setBeatName(e.target.value)}
          maxLength={40}
          placeholder="Name your beat"
          aria-label="Beat name"
          className="bb-display flex-1 min-w-[14rem] bg-transparent text-2xl sm:text-4xl outline-none border-b border-transparent focus:border-[var(--melody)] pb-1 transition-colors placeholder:text-[var(--text-faint)]"
        />
        <button
          type="button"
          onClick={(e) => props.onSave(originOf(e.currentTarget))}
          className="bb-btn bb-btn--tint h-11 px-5"
          style={{ '--c': 'var(--clap)' } as React.CSSProperties}
        >
          <Save className="w-4 h-4" /> Save
        </button>
        <button type="button" onClick={props.onExport} disabled={exporting} className="bb-btn bb-btn--glass h-11 px-5">
          <Download className="w-4 h-4" /> {exporting ? 'Rendering…' : 'Export WAV'}
        </button>
      </section>

      {/* ------------------------------------------------ AI */}
      <section
        ref={aiPanelRef}
        className="bb-panel bb-halo mt-6 p-5 sm:p-6"
        data-busy={aiLoading}
        aria-labelledby="ai-heading"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="ai-heading" className="bb-display text-xl sm:text-2xl">Describe a vibe</h2>
          <p className="text-sm text-[var(--text-dim)]">AI writes the drums, bass and melody. Everything stays editable.</p>
        </div>
        <form
          className="mt-4 flex flex-col sm:flex-row gap-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            props.onGenerate(originOf(aiPanelRef.current))
          }}
        >
          <div className="relative flex-1">
            <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--melody)]" aria-hidden />
            <input
              ref={aiInputRef}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="lo-fi for walking home at 2am"
              maxLength={300}
              aria-label="Describe your vibe"
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[rgba(13,10,31,.65)] border border-[var(--line-strong)] text-base outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-faint)] focus:border-[var(--melody)] focus:shadow-[0_0_0_4px_rgba(255,92,214,.15),0_0_30px_-6px_rgba(255,92,214,.6)]"
            />
          </div>
          <button type="submit" disabled={aiLoading || !promptInput.trim()} className="bb-btn bb-btn--hot h-14 px-7 text-base shrink-0 min-w-[12rem]">
            {aiLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                Making it…
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" /> Make my beat
              </>
            )}
          </button>
        </form>

        <div className="mt-3 min-h-[2.25rem] flex flex-wrap items-center gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {aiLoading ? (
              <motion.p
                key={cookIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bb-shimmer text-sm font-semibold"
                role="status"
              >
                {COOKING[cookIdx]}…
              </motion.p>
            ) : (
              <motion.div key="chips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-2">
                {AI_CHIPS.map((chip) => (
                  <button key={chip} type="button" onClick={() => setPromptInput(chip)} className="bb-chip h-9 px-3.5 text-sm">
                    {chip}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {aiNotice && !aiLoading && <p className="mt-2 text-sm text-[var(--clap)]">{aiNotice}</p>}
      </section>

      {/* ------------------------------------------------ transport */}
      <section className="bb-panel mt-5 p-5 sm:p-6" aria-label="Transport controls">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={props.onTogglePlay}
            data-playing={playing}
            aria-label={playing ? 'Stop playback' : 'Play beat'}
            className="bb-play w-20 h-20 shrink-0"
          >
            {playing ? <Square className="w-7 h-7 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <div className="relative flex-1 min-w-0 h-20 rounded-2xl overflow-hidden" style={{ background: 'rgba(13,10,31,.55)' }}>
            <Spectrum analyser={props.analyser} playing={playing} className="h-full" bars={56} />
            <span className="absolute right-3 bottom-2 text-xs text-[var(--text-faint)] hidden sm:block">
              {playing ? 'Live' : 'Press space to play'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end">
          <label className="block">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Tempo</span>
              <span className="bb-display text-lg tabular-nums" data-testid="bpm-value">
                {pattern.bpm} <span className="text-xs text-[var(--text-dim)] font-normal">BPM</span>
              </span>
            </span>
            <input
              type="range"
              className="bb-range mt-1"
              style={{ '--c': 'var(--kick)', '--val': pct(pattern.bpm, 60, 180) } as React.CSSProperties}
              min={60}
              max={180}
              value={pattern.bpm}
              onChange={(e) => props.onBpmChange(Number(e.target.value))}
              aria-label={`Tempo ${pattern.bpm} beats per minute`}
            />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Swing</span>
              <span className="bb-display text-lg tabular-nums">
                {swingPct}
                <span className="text-xs text-[var(--text-dim)] font-normal">%</span>
              </span>
            </span>
            <input
              type="range"
              className="bb-range mt-1"
              style={{ '--c': 'var(--bass)', '--val': pct(swingPct, 0, 50) } as React.CSSProperties}
              min={0}
              max={50}
              value={swingPct}
              onChange={(e) => props.onSwingChange(Number(e.target.value) / 100)}
              aria-label={`Swing ${swingPct} percent`}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="button" onClick={props.onRandomize} className="bb-btn bb-btn--tint h-11 px-4 text-sm flex-1 lg:flex-none" style={{ '--c': 'var(--hihat)' } as React.CSSProperties}>
              <Shuffle className="w-4 h-4" /> Surprise me
            </button>
            <button type="button" onClick={props.onClear} className="bb-btn bb-btn--glass h-11 px-4 text-sm flex-1 lg:flex-none">
              <Eraser className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ sequencer */}
      <section className="bb-panel mt-5 p-4 sm:p-6" aria-label="Step sequencer">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="bb-display text-xl">The grid</h2>
          <p className="text-sm text-[var(--text-dim)]">Tap a pad to add a sound. One bar of 16 steps that loops forever.</p>
        </div>
        <StepGrid
          pattern={pattern}
          currentStep={currentStep}
          onToggleDrum={props.onToggleDrum}
          onTogglePitch={props.onTogglePitch}
          onPreviewTrack={props.onPreviewTrack}
        />
      </section>

      {/* ------------------------------------------------ mixer */}
      <section className="bb-panel mt-5 p-5 sm:p-6" aria-label="Mixer">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="bb-display text-xl">Mixer</h2>
          <p className="text-sm text-[var(--text-dim)]">Try muting everything but the kick, then bring tracks back one by one.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_TRACKS.map((id) => {
            const meta = TRACK_META[id]
            const muted = pattern.muted[id]
            const vol = Math.round(pattern.volumes[id] * 100)
            const hit = playing && hitsAt(pattern, id, currentStep)
            return (
              <div
                key={id}
                className="rounded-2xl p-3.5 border transition-colors"
                style={{ background: muted ? 'rgba(13,10,31,.4)' : meta.softColor, borderColor: muted ? 'var(--line)' : `color-mix(in srgb, ${meta.color} 30%, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => props.onToggleMute(id)}
                    aria-label={muted ? `Unmute ${meta.label}` : `Mute ${meta.label}`}
                    aria-pressed={muted}
                    className="bb-btn w-9 h-9 shrink-0"
                    style={
                      muted
                        ? { background: 'rgba(185,178,232,.12)', color: 'var(--text-faint)' }
                        : { background: meta.color, color: '#0d0a1f', boxShadow: `0 0 18px -4px ${meta.color}` }
                    }
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className={`font-semibold ${muted ? 'text-[var(--text-faint)]' : ''}`}>{meta.label}</span>
                      <span className="text-xs tabular-nums text-[var(--text-dim)]">{muted ? 'muted' : `${vol}%`}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-[rgba(185,178,232,.1)] overflow-hidden">
                      <div
                        key={hit ? `h${currentStep}` : 'idle'}
                        className="bb-meter"
                        data-hit={hit}
                        style={{ '--c': meta.color, '--lvl': Math.max(0.15, pattern.volumes[id]) } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  className="bb-range mt-2"
                  style={{ '--c': muted ? 'var(--text-faint)' : meta.color, '--val': `${vol}%` } as React.CSSProperties}
                  min={0}
                  max={100}
                  value={vol}
                  onChange={(e) => props.onVolumeChange(id, Number(e.target.value) / 100)}
                  aria-label={`${meta.label} volume ${vol} percent`}
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
