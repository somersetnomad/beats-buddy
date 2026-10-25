'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { BeatPattern, DrumTrackId, PitchTrackId, SavedBeat, TrackId } from '@/lib/beat/types'
import { createEmptyPattern, createStarterPattern, randomPattern, structuredClonePattern, PRESETS, isEmptyPattern } from '@/lib/beat/patterns'
import { BeatEngine } from '@/lib/beat/audio-engine'
import { loadLibrary, saveBeat, deleteBeat as deleteBeatFromStorage, renameBeat as renameBeatInStorage } from '@/lib/beat/storage'
import { celebrate, pulse } from '@/lib/beat/fx'
import { generateBeat, saveWav } from '@/lib/beat/platform'
import HomeView from '@/components/beat/HomeView'
import StudioView from '@/components/beat/StudioView'
import LibraryView from '@/components/beat/LibraryView'
import { toast } from 'sonner'
import { Library, SlidersHorizontal } from 'lucide-react'

type View = 'home' | 'studio' | 'library'
type Origin = { x: number; y: number } | undefined

export default function Page() {
  const [view, setView] = useState<View>('home')
  const [pattern, setPattern] = useState<BeatPattern>(() => createStarterPattern())
  const [beatName, setBeatName] = useState('My first beat')
  const [beatId, setBeatId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [promptInput, setPromptInput] = useState('')
  const [shouldFocusAi, setShouldFocusAi] = useState(false)
  const [library, setLibrary] = useState<SavedBeat[]>([])
  const [lastSavedAt, setLastSavedAt] = useState(0)
  /** id of whatever is being previewed outside the studio (a preset id or a saved beat id) */
  const [auditionId, setAuditionId] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const reduceMotion = useReducedMotion()

  const engineRef = useRef<BeatEngine | null>(null)
  const patternRef = useRef(pattern)
  useLayoutEffect(() => {
    patternRef.current = pattern
  }, [pattern])
  const auditionRef = useRef<BeatPattern | null>(null)

  useEffect(() => {
    // localStorage only exists in the browser, so the library loads after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLibrary(loadLibrary())
  }, [])

  const getEngine = useCallback((): BeatEngine => {
    if (!engineRef.current) {
      const engine = new BeatEngine()
      engine.getPattern = () => auditionRef.current ?? patternRef.current
      engine.onStep = (s) => {
        setCurrentStep(s)
        const p = auditionRef.current ?? patternRef.current
        if (p.drums.kick[s] && !p.muted.kick) pulse('kick', 0.4 + p.volumes.kick * 0.6)
        if ((p.drums.snare[s] && !p.muted.snare) || (p.drums.clap[s] && !p.muted.clap)) pulse('snap', 0.8)
      }
      engine.onStop = () => {
        setPlaying(false)
        setCurrentStep(-1)
        auditionRef.current = null
        setAuditionId(null)
      }
      engineRef.current = engine
    }
    return engineRef.current
  }, [])

  const startEngine = useCallback(() => {
    const engine = getEngine()
    engine.start()
    setPlaying(true)
    setAnalyser(engine.getAnalyser()) // visualizers subscribe once the graph exists
  }, [getEngine])

  const stopAll = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  /** Navigate; anything being previewed stops so the studio never plays a stranger's beat. */
  const go = useCallback((target: View) => {
    if (auditionRef.current) stopAll()
    setView(target)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [stopAll, reduceMotion])

  const togglePlay = useCallback(() => {
    const engine = getEngine()
    if (engine.playing) {
      engine.stop()
      return
    }
    if (isEmptyPattern(patternRef.current)) {
      toast.error('Nothing to play yet', { description: 'Light up a few pads, or hit Surprise me.' })
      return
    }
    startEngine()
  }, [getEngine, startEngine])

  /** Preview a pattern without touching the studio. Same id again = stop. */
  const audition = useCallback((id: string, p: BeatPattern) => {
    const engine = getEngine()
    if (auditionRef.current && auditionId === id && engine.playing) {
      engine.stop()
      return
    }
    auditionRef.current = structuredClonePattern(p)
    setAuditionId(id)
    if (!engine.playing) startEngine()
  }, [auditionId, getEngine, startEngine])

  const toggleDrum = useCallback((track: DrumTrackId, step: number) => {
    const wasOn = patternRef.current.drums[track][step]
    setPattern((p) => {
      const next = structuredClonePattern(p)
      next.drums[track][step] = !next.drums[track][step]
      return next
    })
    if (!wasOn) getEngine().preview(track)
  }, [getEngine])

  const togglePitch = useCallback((track: PitchTrackId, row: number, step: number) => {
    const wasOn = patternRef.current[track][row][step]
    setPattern((p) => {
      const next = structuredClonePattern(p)
      next[track][row][step] = !next[track][row][step]
      return next
    })
    if (!wasOn) getEngine().preview(track, row)
  }, [getEngine])

  const previewTrack = useCallback((track: DrumTrackId | PitchTrackId, row?: number) => {
    getEngine().preview(track, row)
  }, [getEngine])

  const toggleMute = useCallback((track: TrackId) => {
    setPattern((p) => ({ ...structuredClonePattern(p), muted: { ...p.muted, [track]: !p.muted[track] } }))
  }, [])

  const volumeChange = useCallback((track: TrackId, vol: number) => {
    setPattern((p) => ({ ...structuredClonePattern(p), volumes: { ...p.volumes, [track]: vol } }))
  }, [])

  const bpmChange = useCallback((bpm: number) => setPattern((p) => ({ ...p, bpm })), [])
  const swingChange = useCallback((swing: number) => setPattern((p) => ({ ...p, swing })), [])

  const startBlank = useCallback(() => {
    setPattern(createEmptyPattern())
    setBeatName('My first beat')
    setBeatId(null)
    setAiNotice(null)
    go('studio')
  }, [go])

  const startPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const next = structuredClonePattern(preset.pattern)
    const seamless = auditionId === presetId && engineRef.current?.playing
    // hand the loop straight to the studio so the music never drops
    patternRef.current = next
    setPattern(next)
    if (seamless) {
      auditionRef.current = null
      setAuditionId(null)
      setView('studio')
      window.scrollTo({ top: 0 })
    } else {
      go('studio')
    }
    setBeatName(`${preset.label} flip`)
    setBeatId(null)
    setAiNotice(null)
    toast.success(`${preset.label} is loaded`, { description: seamless ? 'Still playing. Tap pads to remix it live.' : 'Press play, then tap pads to remix it.' })
  }, [auditionId, go])

  const randomize = useCallback(() => {
    setPattern(randomPattern(Date.now()))
    setAiNotice(null)
  }, [])

  const clear = useCallback(() => {
    setPattern((p) => ({ ...createEmptyPattern(), bpm: p.bpm, swing: p.swing, volumes: { ...p.volumes }, muted: { ...p.muted } }))
    setAiNotice(null)
  }, [])

  const generate = useCallback(async (origin?: Origin) => {
    const prompt = promptInput.trim()
    if (!prompt || aiLoading) return
    setAiLoading(true)
    setAiNotice(null)
    try {
      const result = await generateBeat(prompt)
      setPattern(result.pattern)
      setBeatId(null) // new vibe = save as a new beat
      if (beatName === 'My first beat' || !beatName.trim()) setBeatName(prompt.slice(0, 32))
      setAiNotice(
        result.source === 'ai'
          ? 'Written by Claude from your vibe. Press play, then make it yours.'
          : result.reason === 'not_granted'
            ? 'Claude was not allowed, so this came from the built-in vibe library. Allow it next time for a beat written just for you.'
            : 'Built from the vibe library to match your words. Every pad is yours to change.'
      )
      celebrate(origin)
      toast.success('Your beat is ready', { description: 'Press play or hit space to hear it.' })
    } catch (err) {
      toast.error('Could not make that beat', { description: err instanceof Error ? err.message : 'Try again in a moment.' })
    } finally {
      setAiLoading(false)
    }
  }, [promptInput, aiLoading, beatName])

  const handleSave = useCallback((origin?: Origin) => {
    const name = beatName.trim() || 'Untitled beat'
    const saved = saveBeat({
      id: beatId && lastSavedAt > 0 ? beatId : null,
      name,
      prompt: aiNotice ? promptInput.trim() : undefined,
      pattern: patternRef.current,
    })
    setBeatId(saved.id)
    setBeatName(saved.name)
    setLastSavedAt(Date.now())
    setLibrary(loadLibrary())
    celebrate(origin)
    toast.success('Saved to your beats')
  }, [beatName, beatId, lastSavedAt, promptInput, aiNotice])

  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      const wav = await getEngine().renderWav(patternRef.current, 4)
      const { outcome, zipped } = await saveWav(wav, beatName)
      if (outcome === 'saved') {
        toast.success('WAV exported', {
          description: zipped ? 'Saved as a .zip with your WAV inside. Four loops at 44.1 kHz.' : 'Four loops at 44.1 kHz. Drop it into any app.',
        })
      } else if (outcome === 'unavailable') {
        toast.error('Saving files is not available here', { description: 'Open this page in the Claude app or a desktop browser to export.' })
      }
    } catch {
      toast.error('Export failed', { description: 'This browser blocked audio rendering. Try Chrome or Safari.' })
    } finally {
      setExporting(false)
    }
  }, [exporting, beatName, getEngine])

  const loadBeat = useCallback((beat: SavedBeat) => {
    if (auditionRef.current) stopAll()
    setPattern(structuredClonePattern(beat.pattern))
    setBeatName(beat.name)
    setBeatId(beat.id)
    setLastSavedAt(beat.createdAt)
    setPromptInput(beat.prompt ?? '')
    setAiNotice(null)
    go('studio')
    toast.success(`Opened “${beat.name}”`)
  }, [go, stopAll])

  const openSavedById = useCallback((id: string) => {
    const beat = loadLibrary().find((b) => b.id === id)
    if (beat) loadBeat(beat)
  }, [loadBeat])

  const deleteBeat = useCallback((id: string) => {
    if (auditionId === id) stopAll()
    setLibrary(deleteBeatFromStorage(id))
    if (beatId === id) setBeatId(null)
    toast.success('Beat deleted')
  }, [beatId, auditionId, stopAll])

  const renameBeat = useCallback((id: string, name: string) => {
    setLibrary(renameBeatInStorage(id, name))
    if (beatId === id) setBeatName(name)
    toast.success('Renamed')
  }, [beatId])

  const goStudioWithAiFocus = useCallback((prompt?: string) => {
    if (prompt) setPromptInput(prompt)
    setShouldFocusAi(true)
    go('studio')
    setTimeout(() => setShouldFocusAi(false), 600)
  }, [go])

  // Space = play/stop in the studio. Ignored while typing or when a control has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || view !== 'studio') return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, button, [contenteditable="true"], [role="dialog"]'))) return
      e.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, togglePlay])

  // stop audio if the tab is closed mid-loop
  useEffect(() => () => engineRef.current?.stop(), [])

  const live = playing

  const navItems: Array<{ id: View; label: string; icon: React.ReactNode }> = [
    { id: 'studio', label: 'Studio', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'library', label: library.length ? `My beats ${library.length}` : 'My beats', icon: <Library className="w-4 h-4" /> },
  ]

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="bb-stage" aria-hidden>
        <div className="bb-stage__blob bb-stage__blob--a" />
        <div className="bb-stage__blob bb-stage__blob--b" />
        <div className="bb-stage__blob bb-stage__blob--c" />
        <div className="bb-stage__flash" />
        <div className="bb-stage__grid" />
        <div className="bb-stage__grain" />
      </div>

      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="bb-panel bb-glass flex items-center gap-3 h-14 pl-3 pr-2 !rounded-full">
            <button
              type="button"
              onClick={() => go('home')}
              className="flex items-center gap-2.5 rounded-full pr-2"
              aria-label="BeatBuddy home"
            >
              <span className="bb-eq flex items-end gap-[3px] h-6 w-7 justify-center" data-live={live} aria-hidden>
                <span className="h-4" style={{ background: 'var(--kick)', boxShadow: '0 0 8px var(--kick)' }} />
                <span className="h-6" style={{ background: 'var(--melody)', boxShadow: '0 0 8px var(--melody)' }} />
                <span className="h-5" style={{ background: 'var(--bass)', boxShadow: '0 0 8px var(--bass)' }} />
                <span className="h-3" style={{ background: 'var(--clap)', boxShadow: '0 0 8px var(--clap)' }} />
              </span>
              <span className="bb-display text-lg sm:text-xl">BeatBuddy</span>
            </button>

            <nav className="ml-auto flex items-center gap-1" aria-label="Main">
              {navItems.map((item) => {
                const active = view === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                    className={`relative flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-full text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'var(--hot)', boxShadow: '0 0 24px -4px rgba(255,92,214,.7)' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      {item.icon}
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={reduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {view === 'home' && (
              <HomeView
                library={library}
                playing={playing}
                auditionId={auditionId}
                currentStep={auditionId ? currentStep : -1}
                onAudition={audition}
                onUsePreset={startPreset}
                onStartBlank={startBlank}
                onOpenLibrary={() => go('library')}
                onOpenBeat={openSavedById}
                onAiFocus={goStudioWithAiFocus}
              />
            )}
            {view === 'studio' && (
              <StudioView
                pattern={pattern}
                currentStep={auditionId ? -1 : currentStep}
                playing={playing}
                analyser={analyser}
                exporting={exporting}
                aiLoading={aiLoading}
                aiNotice={aiNotice}
                beatName={beatName}
                promptInput={promptInput}
                setPromptInput={setPromptInput}
                setBeatName={setBeatName}
                onTogglePlay={togglePlay}
                onBpmChange={bpmChange}
                onSwingChange={swingChange}
                onToggleDrum={toggleDrum}
                onTogglePitch={togglePitch}
                onPreviewTrack={previewTrack}
                onToggleMute={toggleMute}
                onVolumeChange={volumeChange}
                onRandomize={randomize}
                onClear={clear}
                onGenerate={generate}
                onSave={handleSave}
                onExport={handleExport}
                shouldFocusAi={shouldFocusAi}
              />
            )}
            {view === 'library' && (
              <LibraryView
                library={library}
                auditionId={auditionId}
                playing={playing}
                currentStep={auditionId ? currentStep : -1}
                onAudition={audition}
                onLoadBeat={loadBeat}
                onDeleteBeat={deleteBeat}
                onRenameBeat={renameBeat}
                onGoHome={() => go('home')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-faint)]">
          <p>BeatBuddy. Made for people who have never made a beat. Yet.</p>
          <p>Your beats are saved in this browser only.</p>
        </div>
      </footer>
    </div>
  )
}
