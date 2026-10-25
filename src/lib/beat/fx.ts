'use client'

import confetti from 'canvas-confetti'

const NEONS = ['#FF4D6D', '#FF9F1C', '#F9F871', '#2DF5C4', '#8B5CFF', '#FF5CD6']

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Drives the page-wide beat-reactive CSS properties (--kick-hit, --snap-hit).
 * Everything that "breathes" with the music reads those two numbers.
 */
export function pulse(kind: 'kick' | 'snap', strength = 1) {
  if (typeof document === 'undefined' || reducedMotion()) return
  const el = document.documentElement
  const prop = kind === 'kick' ? '--kick-hit' : '--snap-hit'
  try {
    el.animate([{ [prop]: String(Math.min(1, strength)) }, { [prop]: '0' }], {
      duration: kind === 'kick' ? 420 : 260,
      easing: 'cubic-bezier(.15,.7,.3,1)',
    })
  } catch {
    // older browsers without registered-property animation: no pulse, no problem
  }
}

/** Celebration burst in the track colours. */
export function celebrate(origin?: { x: number; y: number }) {
  if (reducedMotion()) return
  const o = origin ?? { x: 0.5, y: 0.35 }
  confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: o, colors: NEONS, scalar: 0.9, ticks: 160, zIndex: 100 })
  setTimeout(() => confetti({ particleCount: 40, spread: 120, startVelocity: 24, origin: o, colors: NEONS, shapes: ['circle'], scalar: 0.7, ticks: 140, zIndex: 100 }), 120)
}

export function originOf(el: Element | null | undefined) {
  if (!el || typeof window === 'undefined') return undefined
  const r = el.getBoundingClientRect()
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
}
