'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { BeatPattern, SavedBeat } from '@/lib/beat/types'
import { STEPS, TRACK_META } from '@/lib/beat/types'
import { PRESETS } from '@/lib/beat/patterns'
import { MiniPattern, patternRows } from './Visuals'
import { Grid3x3, Pause, Play, Wand2, ArrowUpRight } from 'lucide-react'

interface HomeViewProps {
  library: SavedBeat[]
  playing: boolean
  auditionId: string | null
  currentStep: number
  onAudition: (id: string, pattern: BeatPattern) => void
  onUsePreset: (presetId: string) => void
  onStartBlank: () => void
  onOpenLibrary: () => void
  onOpenBeat: (id: string) => void
  onAiFocus: (prompt?: string) => void
}

const PROMPTS = [
  'lo-fi for a rainy bus ride',
  'boss fight trap at 140',
  'summer pop with handclaps',
  'late-night study session',
  'funky roller-disco groove',
  'house for getting ready',
  'dark drill, slow and heavy',
  'happy beat for a skate video',
]

const ease = [0.2, 0.7, 0.2, 1] as const

export default function HomeView(props: HomeViewProps) {
  const { library, playing, auditionId, currentStep, onAudition, onUsePreset } = props
  const [heroId, setHeroId] = useState(PRESETS[0].id)
  const reduce = useReducedMotion()
  const hero = PRESETS.find((p) => p.id === heroId) ?? PRESETS[0]
  const heroLive = playing && auditionId === hero.id
  const rows = patternRows(hero.pattern)

  const pickHero = (id: string) => {
    setHeroId(id)
    // already listening? swap the groove live
    const p = PRESETS.find((x) => x.id === id)
    if (p && playing && auditionId && PRESETS.some((x) => x.id === auditionId)) onAudition(p.id, p.pattern)
  }

  const reveal = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.08 * i, ease } }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10">
      {/* ------------------------------------------------ hero */}
      <section className="pt-12 sm:pt-20 text-center">
        <motion.p {...reveal(0)} className="bb-chip mx-auto w-fit px-3.5 py-1.5 text-sm">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-[var(--clap)] animate-ping opacity-70" />
            <span className="relative w-2 h-2 rounded-full bg-[var(--clap)]" />
          </span>
          Free, no account, runs in your browser
        </motion.p>

        <motion.h1 {...reveal(1)} className="bb-display bb-glow-text mt-6 text-[clamp(2.6rem,8.4vw,6.6rem)] leading-[0.95]">
          Tap the lights.
          <br />
          Make a beat.
        </motion.h1>

        <motion.p {...reveal(2)} className="mx-auto mt-6 max-w-xl text-lg sm:text-xl text-[var(--text-dim)] leading-relaxed">
          Describe a vibe and AI writes the drums, bass and melody. Then light up pads to make it yours. No lessons, and no wrong notes.
        </motion.p>

        <motion.div {...reveal(3)} className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => props.onAiFocus()} className="bb-btn bb-btn--hot h-14 px-7 text-base sm:text-lg">
            <Wand2 className="w-5 h-5" /> Make a beat with AI
          </button>
          <button type="button" onClick={props.onStartBlank} className="bb-btn bb-btn--glass h-14 px-7 text-base sm:text-lg">
            <Grid3x3 className="w-5 h-5" /> Start from a blank grid
          </button>
        </motion.div>

        {/* the device: a pad controller you can actually play */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 60, rotateX: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.35, ease }}
          style={{ perspective: 1200 }}
          className="mt-14 sm:mt-16"
        >
          <div className="bb-panel bb-halo mx-auto max-w-4xl p-4 sm:p-6 text-left !rounded-[32px]" data-busy={heroLive}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Choose a vibe to hear">
                {PRESETS.map((p) => {
                  const active = p.id === heroId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => pickHero(p.id)}
                      className={`relative h-9 px-3.5 rounded-full text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="hero-tab"
                          className="absolute inset-0 rounded-full"
                          style={{ background: p.gradient, boxShadow: '0 0 24px -6px rgba(255,255,255,.5)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative">{p.label}</span>
                    </button>
                  )
                })}
              </div>
              <span className="ml-auto text-sm text-[var(--text-faint)] tabular-nums">{hero.pattern.bpm} BPM</span>
            </div>

            {/* pad matrix */}
            <div
              className="mt-5 grid gap-1 sm:gap-2 [--hero-label:0.5rem] sm:[--hero-label:3.8rem]"
              style={{ gridTemplateColumns: `var(--hero-label) repeat(${STEPS}, minmax(0, 1fr))` }}
            >
              {rows.map(({ id, steps }, r) => (
                <HeroRow key={id} id={id} steps={steps} row={r} live={heroLive} step={currentStep} reduce={!!reduce} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-4">
              <button
                type="button"
                onClick={() => onAudition(hero.id, hero.pattern)}
                className="bb-play w-16 h-16 shrink-0"
                data-playing={heroLive}
                aria-label={heroLive ? `Stop the ${hero.label} beat` : `Play the ${hero.label} beat`}
              >
                {heroLive ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="bb-display text-base sm:text-lg">{heroLive ? `${hero.label} is playing` : `Hear the ${hero.label} beat`}</p>
                <p className="text-sm text-[var(--text-dim)]">{hero.blurb}. Switch vibes while it plays.</p>
              </div>
              <button type="button" onClick={() => onUsePreset(hero.id)} className="bb-btn bb-btn--glass h-12 px-5 w-full sm:w-auto sm:ml-auto">
                Remix this beat <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------ prompt marquee */}
      <section className="mt-16" aria-labelledby="ideas-heading">
        <h2 id="ideas-heading" className="text-center text-[var(--text-dim)]">Stuck for a vibe? Tap one and the AI takes it from there.</h2>
        <div className="bb-marquee mt-5 overflow-hidden">
          <div className="bb-marquee__track gap-3 pr-3">
            {[...PROMPTS, ...PROMPTS].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => props.onAiFocus(p)}
                tabIndex={i >= PROMPTS.length ? -1 : 0}
                aria-hidden={i >= PROMPTS.length}
                className="bb-chip shrink-0 h-11 px-5 text-[15px]"
              >
                <Wand2 className="w-4 h-4" style={{ color: TRACK_META[(['kick', 'snare', 'hihat', 'clap', 'bass', 'melody'] as const)[i % 6]].color }} />
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ saved beats */}
      {library.length > 0 && (
        <section className="mt-20" aria-labelledby="recent-heading">
          <div className="flex items-end justify-between gap-4">
            <h2 id="recent-heading" className="bb-display text-2xl sm:text-3xl">Pick up where you left off</h2>
            <button type="button" onClick={props.onOpenLibrary} className="text-sm font-semibold text-[var(--text-dim)] hover:text-white shrink-0">
              All {library.length} beats
            </button>
          </div>
          <div className="mt-5 flex gap-4 overflow-x-auto bb-scroll pb-3 -mx-4 px-4 snap-x">
            {library.slice(0, 6).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => props.onOpenBeat(b.id)}
                className="bb-panel snap-start shrink-0 w-64 p-4 text-left !rounded-3xl transition-transform hover:-translate-y-1"
              >
                <MiniPattern pattern={b.pattern} />
                <div className="mt-3 font-semibold truncate">{b.name}</div>
                <div className="text-sm text-[var(--text-faint)]">
                  {b.pattern.bpm} BPM, saved {new Date(b.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ vibes */}
      <section className="mt-20" aria-labelledby="vibes-heading">
        <h2 id="vibes-heading" className="bb-display text-3xl sm:text-4xl">Start from a vibe</h2>
        <p className="mt-2 text-[var(--text-dim)] max-w-lg">Six grooves that already sound good. Preview one, then pull it apart in the studio.</p>
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESETS.map((p) => {
            const live = playing && auditionId === p.id
            return (
              <article
                key={p.id}
                className={`bb-panel group p-5 !rounded-3xl transition-transform duration-300 hover:-translate-y-1 ${live ? 'bb-halo' : ''}`}
                data-busy={live}
              >
                <div className="relative rounded-2xl p-3 overflow-hidden" style={{ background: 'rgba(13,10,31,.6)' }}>
                  <div
                    className="absolute -inset-10 opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                    style={{ background: p.gradient }}
                    aria-hidden
                  />
                  <MiniPattern pattern={p.pattern} step={live ? currentStep : -1} className="relative" />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="bb-display text-xl">{p.label}</h3>
                    <p className="text-sm text-[var(--text-dim)]">
                      {p.blurb}, {p.pattern.bpm} BPM
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAudition(p.id, p.pattern)}
                    className="bb-btn bb-btn--glass w-11 h-11 shrink-0"
                    aria-label={live ? `Stop ${p.label} preview` : `Preview ${p.label}`}
                    style={live ? { boxShadow: '0 0 24px -2px var(--melody)', borderColor: 'var(--melody)' } : undefined}
                  >
                    {live ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <button type="button" onClick={() => onUsePreset(p.id)} className="bb-btn bb-btn--hot h-11 px-4 text-sm shrink-0">
                    Use it
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------ how it works (a real sequence) */}
      <section className="mt-20" aria-labelledby="how-heading">
        <h2 id="how-heading" className="bb-display text-3xl sm:text-4xl">Three steps, about a minute</h2>
        <ol className="mt-7 grid sm:grid-cols-3 gap-4">
          {[
            { c: 'var(--melody)', title: 'Say the vibe', body: 'Type “lo-fi for a rainy bus ride”. AI writes a full beat in a few seconds.' },
            { c: 'var(--clap)', title: 'Light it up', body: 'Every pad is a sound. Tap them while the loop plays and hear the change instantly.' },
            { c: 'var(--snare)', title: 'Keep it', body: 'Save it to your beats, or export a WAV for TikTok, CapCut or your DAW.' },
          ].map((s, i) => (
            <li key={s.title} className="bb-panel p-6 !rounded-3xl">
              <span
                className="bb-display grid place-items-center w-11 h-11 rounded-full text-lg"
                style={{ color: s.c, border: `1px solid ${s.c}`, boxShadow: `0 0 24px -4px ${s.c}, inset 0 0 12px -4px ${s.c}` }}
              >
                {i + 1}
              </span>
              <h3 className="bb-display mt-5 text-xl">{s.title}</h3>
              <p className="mt-2 text-[var(--text-dim)] leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function HeroRow({ id, steps, row, live, step, reduce }: { id: keyof typeof TRACK_META; steps: boolean[]; row: number; live: boolean; step: number; reduce: boolean }) {
  const meta = TRACK_META[id]
  return (
    <>
      <span className="text-xs sm:text-sm font-semibold text-[var(--text-dim)] self-center truncate min-w-0">
        <span className="sm:hidden block w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} title={meta.label} />
        <span className="hidden sm:inline">{meta.label}</span>
      </span>
      {steps.map((on, s) => {
        const now = live && step === s
        const idle = !live && on && !reduce
        return (
          <span
            key={s}
            className="bb-pad aspect-square !cursor-default !rounded-[5px] sm:!rounded-[9px]"
            style={{ '--c': meta.color } as React.CSSProperties}
            data-on={on && (live || reduce) ? true : undefined}
            data-now={now}
            aria-hidden
          >
            {idle && (
              <span
                className="bb-attract absolute inset-0 rounded-[inherit]"
                style={{ background: meta.color, boxShadow: `0 0 14px ${meta.color}`, animationDelay: `${s * 0.11 + row * 0.04}s` }}
              />
            )}
          </span>
        )
      })}
    </>
  )
}
