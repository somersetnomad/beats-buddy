'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { BeatPattern, SavedBeat } from '@/lib/beat/types'
import { MiniPattern } from './Visuals'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Grid3x3, Pause, Pencil, Play, SlidersHorizontal, Trash2 } from 'lucide-react'

interface LibraryViewProps {
  library: SavedBeat[]
  auditionId: string | null
  playing: boolean
  currentStep: number
  onAudition: (id: string, pattern: BeatPattern) => void
  onLoadBeat: (beat: SavedBeat) => void
  onDeleteBeat: (id: string) => void
  onRenameBeat: (id: string, name: string) => void
  onGoHome: () => void
}

export default function LibraryView({ library, auditionId, playing, currentStep, onAudition, onLoadBeat, onDeleteBeat, onRenameBeat, onGoHome }: LibraryViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SavedBeat | null>(null)
  const reduce = useReducedMotion()

  const startRename = (beat: SavedBeat) => {
    setEditingId(beat.id)
    setEditName(beat.name)
  }

  const commitRename = () => {
    if (editingId && editName.trim()) onRenameBeat(editingId, editName.trim().slice(0, 40))
    setEditingId(null)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10">
      <section className="pt-10 sm:pt-14">
        <h1 className="bb-display text-4xl sm:text-5xl">My beats</h1>
        <p className="mt-2 text-[var(--text-dim)]">Saved in this browser. Press play to preview, open one to keep working.</p>
      </section>

      {library.length === 0 ? (
        <div className="bb-panel bb-halo mt-10 px-6 py-14 text-center">
          <div className="mx-auto grid grid-cols-4 gap-2 w-28" aria-hidden>
            {['--kick', '--snare', '--hihat', '--clap', '--bass', '--melody', '--kick', '--clap'].map((c, i) => (
              <span
                key={i}
                className="bb-attract aspect-square rounded-md"
                style={{ background: `var(${c})`, boxShadow: `0 0 14px var(${c})`, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <h2 className="bb-display mt-8 text-2xl">Nothing saved yet</h2>
          <p className="mt-2 text-[var(--text-dim)]">Make a beat in the studio and press Save. It will show up here.</p>
          <button type="button" onClick={onGoHome} className="bb-btn bb-btn--hot mt-7 h-12 px-6">
            <Grid3x3 className="w-5 h-5" /> Make my first beat
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={!reduce}>
            {library.map((beat, i) => {
              const live = playing && auditionId === beat.id
              return (
                <motion.li
                  key={beat.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04 }}
                  className={`bb-panel p-4 !rounded-3xl ${live ? 'bb-halo' : ''}`}
                  data-busy={live}
                >
                  <button
                    type="button"
                    onClick={() => onAudition(beat.id, beat.pattern)}
                    className="relative block w-full rounded-2xl p-3 group"
                    style={{ background: 'rgba(13,10,31,.6)' }}
                    aria-label={live ? `Stop ${beat.name}` : `Preview ${beat.name}`}
                  >
                    <MiniPattern pattern={beat.pattern} step={live ? currentStep : -1} />
                    <span
                      className={`absolute inset-0 grid place-items-center rounded-2xl transition-opacity ${live ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                      style={{ background: 'rgba(13,10,31,.45)' }}
                    >
                      <span className="bb-play w-12 h-12" data-playing={live}>
                        {live ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </span>
                    </span>
                  </button>

                  <div className="mt-3.5">
                    {editingId === beat.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          commitRename()
                        }}
                      >
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={commitRename}
                          maxLength={40}
                          className="w-full h-9 px-3 rounded-xl bg-[rgba(13,10,31,.65)] border border-[var(--melody)] font-semibold outline-none"
                          aria-label="Beat name"
                        />
                      </form>
                    ) : (
                      <h2 className="font-semibold text-lg truncate">{beat.name}</h2>
                    )}
                    <p className="text-sm text-[var(--text-faint)] truncate">
                      {beat.pattern.bpm} BPM, saved {new Date(beat.createdAt).toLocaleDateString()}
                      {beat.prompt ? `, from “${beat.prompt}”` : ''}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => onLoadBeat(beat)} className="bb-btn bb-btn--hot h-10 px-4 text-sm flex-1">
                      <SlidersHorizontal className="w-4 h-4" /> Open in studio
                    </button>
                    <button type="button" onClick={() => startRename(beat)} className="bb-btn bb-btn--glass w-10 h-10" aria-label={`Rename ${beat.name}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(beat)}
                      className="bb-btn bb-btn--tint w-10 h-10"
                      style={{ '--c': 'var(--kick)' } as React.CSSProperties}
                      aria-label={`Delete ${beat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bb-panel max-w-sm !rounded-3xl border-[var(--line-strong)] bg-[#1a1440]">
          <AlertDialogHeader>
            <AlertDialogTitle className="bb-display text-2xl">Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-dim)]">This removes it from this browser for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bb-btn bb-btn--glass h-11 px-5 mt-0 border-[var(--line-strong)]">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) onDeleteBeat(deleteTarget.id)
                setDeleteTarget(null)
              }}
              className="bb-btn h-11 px-5 mt-0 text-white"
              style={{ background: 'var(--kick)', boxShadow: '0 0 30px -6px var(--kick)' }}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
