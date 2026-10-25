'use client'

import { memo } from 'react'
import { TRACK_META, DRUM_TRACKS, STEPS, BASS_ROWS, MELODY_ROWS } from '@/lib/beat/types'
import type { BeatPattern, DrumTrackId, PitchTrackId, TrackId } from '@/lib/beat/types'

const BASS_NOTES = ['C2', 'D#2', 'F2', 'G2', 'A#2', 'C3']
const MELODY_NOTES = ['C4', 'D#4', 'F4', 'G4', 'A#4', 'C5', 'D#5', 'F5']

interface StepGridProps {
  pattern: BeatPattern
  currentStep: number
  onToggleDrum: (track: DrumTrackId, step: number) => void
  onTogglePitch: (track: PitchTrackId, row: number, step: number) => void
  onPreviewTrack: (track: DrumTrackId | PitchTrackId, row?: number) => void
}

// label column + 16 steps; the beam math below relies on these two values
const LABEL = 'clamp(4.6rem, 12vw, 7rem)'
const GAP = '5px'
const COLS = { gridTemplateColumns: `${LABEL} repeat(${STEPS}, minmax(1.7rem, 1fr))`, columnGap: GAP } as const

const steps = Array.from({ length: STEPS }, (_, s) => s)

function Pad({
  on, now, muted, color, label, onClick, tall,
}: { on: boolean; now: boolean; muted: boolean; color: string; label: string; onClick: () => void; tall?: boolean; step: number }) {
  return (
    <button
      type="button"
      className={`bb-pad ${tall ? 'h-11' : 'h-7'}`}
      style={{ '--c': color } as React.CSSProperties}
      data-on={on}
      data-now={now}
      data-muted={muted}
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
    />
  )
}

function StepGridInner({ pattern, currentStep, onToggleDrum, onTogglePitch, onPreviewTrack }: StepGridProps) {
  const beamVisible = currentStep >= 0
  const col = `((100% - ${LABEL} - ${STEPS} * ${GAP}) / ${STEPS})`
  const beamStyle = {
    left: `calc(${LABEL} + ${GAP} + ${Math.max(0, currentStep)} * (${col} + ${GAP}) - 3px)`,
    width: `calc(${col} + 6px)`,
    opacity: beamVisible ? 1 : 0,
  }

  const groupLabel = (id: TrackId, note: string) => {
    const meta = TRACK_META[id]
    return (
      <div className="mt-5 mb-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPreviewTrack(id as PitchTrackId, 2)}
          className="bb-chip px-3 py-1 text-xs"
          style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)` }}
          title={`Hear the ${meta.label.toLowerCase()}`}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
          {meta.label}
        </button>
        <span className="text-xs text-[var(--text-faint)]">{note}</span>
      </div>
    )
  }

  return (
    <div className="bb-scroll overflow-x-auto -mx-1 px-1 pb-2" data-testid="step-grid">
      <div className="relative min-w-[680px]">
        <div className="bb-beam" style={beamStyle} aria-hidden />

        {/* ruler */}
        <div className="grid items-center mb-1.5" style={COLS} aria-hidden>
          <span />
          {steps.map((s) => {
            const isBeat = s % 4 === 0
            const isNow = currentStep === s
            return (
              <div key={s} className="h-5 flex items-center justify-center">
                {isBeat ? (
                  <span
                    className="bb-display text-[11px] w-5 h-5 grid place-items-center rounded-full transition-all"
                    style={isNow ? { background: '#fff', color: 'var(--ink)', boxShadow: '0 0 16px #fff' } : { color: 'var(--text-dim)' }}
                  >
                    {s / 4 + 1}
                  </span>
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: isNow ? '#fff' : 'rgba(185,178,232,.25)', boxShadow: isNow ? '0 0 10px #fff' : undefined }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* drums */}
        <div className="space-y-1.5">
          {DRUM_TRACKS.map((id) => {
            const meta = TRACK_META[id]
            const muted = pattern.muted[id]
            return (
              <div key={id} className="grid items-center" style={COLS}>
                <button
                  type="button"
                  onClick={() => onPreviewTrack(id)}
                  className="h-11 flex items-center gap-2 pr-2 rounded-xl text-left group"
                  aria-label={`Hear the ${meta.label}`}
                  title={meta.hint}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-150"
                    style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}`, opacity: muted ? 0.3 : 1 }}
                  />
                  <span className={`text-sm font-semibold truncate ${muted ? 'text-[var(--text-faint)] line-through' : ''}`}>{meta.label}</span>
                </button>
                {steps.map((s) => (
                  <Pad
                    key={s}
                    step={s}
                    tall
                    on={pattern.drums[id][s]}
                    now={currentStep === s}
                    muted={muted}
                    color={meta.color}
                    label={`${meta.label} step ${s + 1}`}
                    onClick={() => onToggleDrum(id, s)}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* bass */}
        {groupLabel('bass', 'One note at a time. Higher rows play higher notes.')}
        <div className="space-y-1">
          {Array.from({ length: BASS_ROWS }, (_, i) => BASS_ROWS - 1 - i).map((r) => (
            <div key={r} className="grid items-center" style={COLS}>
              <button
                type="button"
                onClick={() => onPreviewTrack('bass', r)}
                className="h-7 text-left text-xs font-semibold text-[var(--text-faint)] hover:text-white transition-colors"
                aria-label={`Hear bass note ${BASS_NOTES[r]}`}
              >
                {BASS_NOTES[r]}
              </button>
              {steps.map((s) => (
                <Pad
                  key={s}
                  step={s}
                  on={pattern.bass[r][s]}
                  now={currentStep === s}
                  muted={pattern.muted.bass}
                  color={TRACK_META.bass.color}
                  label={`Bass ${BASS_NOTES[r]} step ${s + 1}`}
                  onClick={() => onTogglePitch('bass', r, s)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* melody */}
        {groupLabel('melody', 'Every note fits the key, so you cannot hit a wrong one.')}
        <div className="space-y-1">
          {Array.from({ length: MELODY_ROWS }, (_, i) => MELODY_ROWS - 1 - i).map((r) => (
            <div key={r} className="grid items-center" style={COLS}>
              <button
                type="button"
                onClick={() => onPreviewTrack('melody', r)}
                className="h-7 text-left text-xs font-semibold text-[var(--text-faint)] hover:text-white transition-colors"
                aria-label={`Hear melody note ${MELODY_NOTES[r]}`}
              >
                {MELODY_NOTES[r]}
              </button>
              {steps.map((s) => (
                <Pad
                  key={s}
                  step={s}
                  on={pattern.melody[r][s]}
                  now={currentStep === s}
                  muted={pattern.muted.melody}
                  color={TRACK_META.melody.color}
                  label={`Melody ${MELODY_NOTES[r]} step ${s + 1}`}
                  onClick={() => onTogglePitch('melody', r, s)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(StepGridInner)
