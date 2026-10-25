import type { BeatPattern, DrumTrackId } from './types'
import { BASS_ROWS, DRUM_TRACKS, MELODY_ROWS, STEPS } from './types'

export const BASS_FREQS = [65.41, 77.78, 87.31, 98.0, 116.54, 130.81] // C2 D#2 F2 G2 A#2 C3
export const MELODY_FREQS = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25, 622.25, 698.46] // C minor pentatonic-ish

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD = 0.14
const WATCHER_MS = 16

type Ctx = BaseAudioContext

function makeNoiseBuffer(ctx: Ctx): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 1.2)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

// ------------------------------------------------------------------ drum voices

function playKick(ctx: Ctx, dest: AudioNode, t: number, vol: number) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(155, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11)
  g.gain.setValueAtTime(Math.min(1.2, vol), t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.36)

  // click transient
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o2.type = 'square'
  o2.frequency.setValueAtTime(950, t)
  g2.gain.setValueAtTime(vol * 0.25, t)
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
  o2.connect(g2).connect(dest)
  o2.start(t)
  o2.stop(t + 0.03)
}

function playSnare(ctx: Ctx, dest: AudioNode, noise: AudioBuffer, t: number, vol: number) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800
  bp.Q.value = 0.9
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.8, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.19)
  src.connect(bp).connect(g).connect(dest)
  src.start(t, Math.random() * 0.4, 0.25)

  const o = ctx.createOscillator()
  const g2 = ctx.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(196, t)
  g2.gain.setValueAtTime(vol * 0.55, t)
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
  o.connect(g2).connect(dest)
  o.start(t)
  o.stop(t + 0.12)
}

function playHihat(ctx: Ctx, dest: AudioNode, noise: AudioBuffer, t: number, vol: number) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 7400
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.055)
  src.connect(hp).connect(g).connect(dest)
  src.start(t, Math.random() * 0.4, 0.08)
}

function playClap(ctx: Ctx, dest: AudioNode, noise: AudioBuffer, t: number, vol: number) {
  for (let i = 0; i < 3; i++) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1150
    bp.Q.value = 1.4
    const g = ctx.createGain()
    const tt = t + i * 0.012
    g.gain.setValueAtTime(vol * (0.65 - i * 0.12), tt)
    g.gain.exponentialRampToValueAtTime(0.001, tt + 0.09)
    src.connect(bp).connect(g).connect(dest)
    src.start(tt, Math.random() * 0.4, 0.12)
  }
  // tail
  const src = ctx.createBufferSource()
  src.buffer = noise
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1000
  bp.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.5, t + 0.036)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
  src.connect(bp).connect(g).connect(dest)
  src.start(t + 0.036, Math.random() * 0.4, 0.3)
}

// ------------------------------------------------------------------ pitched voices

function playBass(ctx: Ctx, dest: AudioNode, t: number, freq: number, dur: number, vol: number) {
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = freq
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 6
  lp.frequency.setValueAtTime(Math.min(900, freq * 9), t)
  lp.frequency.exponentialRampToValueAtTime(Math.max(90, freq * 2.4), t + 0.18)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol * 0.85, t + 0.008)
  g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.01, dur - 0.06))
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05)
  o.connect(lp).connect(g).connect(dest)
  o.start(t)
  o.stop(t + dur + 0.08)
}

function playMelody(ctx: Ctx, dest: AudioNode, delaySend: AudioNode | null, t: number, freq: number, dur: number, vol: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.22)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2400
  g.connect(lp).connect(dest)
  if (delaySend) g.connect(delaySend)

  for (const detune of [-5, 5]) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freq
    o.detune.value = detune
    o.connect(g)
    o.start(t)
    o.stop(t + dur + 0.3)
  }
}

// ------------------------------------------------------------------ scheduling helpers

export function secondsPerStep(bpm: number): number {
  return 60 / bpm / 4
}

function noteLength(rows: boolean[][], step: number, spb: number, min: number, max: number): number {
  for (let s = step + 1; s < STEPS; s++) {
    if (rows.some((r) => r[s])) return Math.min(max, Math.max(min, (s - step) * spb))
  }
  return Math.min(max, Math.max(min, 4 * spb))
}

/** Schedule one sequencer step of `pattern` into `dest` at absolute time `t`. */
function scheduleStep(pattern: BeatPattern, ctx: Ctx, dest: AudioNode, delaySend: AudioNode | null, noise: AudioBuffer, step: number, t: number) {
  const spb = secondsPerStep(pattern.bpm)
  const swung = step % 4 === 2 ? pattern.swing * spb * 0.9 : 0
  const tt = t + swung

  for (const id of DRUM_TRACKS) {
    if (pattern.muted[id] || !pattern.drums[id][step]) continue
    const vol = pattern.volumes[id]
    if (id === 'kick') playKick(ctx, dest, tt, vol)
    else if (id === 'snare') playSnare(ctx, dest, noise, tt, vol)
    else if (id === 'hihat') playHihat(ctx, dest, noise, tt, vol)
    else playClap(ctx, dest, noise, tt, vol)
  }

  if (!pattern.muted.bass) {
    for (let r = 0; r < BASS_ROWS; r++) {
      if (pattern.bass[r][step]) {
        const dur = noteLength(pattern.bass, step, spb, 0.16, 0.5)
        playBass(ctx, dest, tt, BASS_FREQS[r], dur, pattern.volumes.bass)
        break // monophonic, lowest row wins
      }
    }
  }

  if (!pattern.muted.melody) {
    for (let r = 0; r < MELODY_ROWS; r++) {
      if (pattern.melody[r][step]) {
        const dur = noteLength(pattern.melody, step, spb, 0.18, 0.6)
        playMelody(ctx, dest, delaySend, tt, MELODY_FREQS[r], dur, pattern.volumes.melody)
        break
      }
    }
  }
}

function createBusCompressor(ctx: Ctx): DynamicsCompressorNode {
  const c = ctx.createDynamicsCompressor()
  c.threshold.value = -14
  c.knee.value = 10
  c.ratio.value = 3.2
  c.attack.value = 0.006
  c.release.value = 0.16
  return c
}

// ------------------------------------------------------------------ WAV encoding

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels
  const len = buffer.length
  const bytes = 44 + len * numCh * 2
  const ab = new ArrayBuffer(bytes)
  const dv = new DataView(ab)
  const wstr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i))
  }
  wstr(0, 'RIFF')
  dv.setUint32(4, bytes - 8, true)
  wstr(8, 'WAVE')
  wstr(12, 'fmt ')
  dv.setUint32(16, 16, true)
  dv.setUint16(20, 1, true)
  dv.setUint16(22, numCh, true)
  dv.setUint32(24, buffer.sampleRate, true)
  dv.setUint32(28, buffer.sampleRate * numCh * 2, true)
  dv.setUint16(32, numCh * 2, true)
  dv.setUint16(34, 16, true)
  wstr(36, 'data')
  dv.setUint32(40, len * numCh * 2, true)

  const chans: Float32Array[] = []
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c))
  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]))
      dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

// ------------------------------------------------------------------ engine

interface QueueItem {
  step: number
  time: number
}

export class BeatEngine {
  playing = false
  getPattern: () => BeatPattern | null = () => null
  onStep: (step: number) => void = () => {}
  onStop: () => void = () => {}

  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private delaySend: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private watcher: ReturnType<typeof setInterval> | null = null
  private nextStepTime = 0
  private step = 0
  private queue: QueueItem[] = []

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const AC: typeof AudioContext = window.AudioContext
    const ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = 0.85
    // glue + loudness: gentle bus compression before the meters
    const bus = createBusCompressor(ctx)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.78
    master.connect(bus).connect(analyser).connect(ctx.destination)

    // simple echo for melody space
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.29
    const fb = ctx.createGain()
    fb.gain.value = 0.3
    const dampen = ctx.createBiquadFilter()
    dampen.type = 'lowpass'
    dampen.frequency.value = 2200
    delay.connect(fb).connect(dampen).connect(delay)
    const send = ctx.createGain()
    send.gain.value = 0.25
    send.connect(delay)
    delay.connect(master)

    this.ctx = ctx
    this.master = master
    this.analyser = analyser
    this.delaySend = send
    this.noise = makeNoiseBuffer(ctx)
    return ctx
  }

  /** Live spectrum tap for visualizers. Creates the audio graph lazily. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  start() {
    const ctx = this.ensure()
    if (this.playing) return
    if (ctx.state === 'suspended') void ctx.resume()
    this.playing = true
    this.step = 0
    this.queue = []
    this.nextStepTime = ctx.currentTime + 0.08
    this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS)
    this.watcher = setInterval(() => this.drainQueue(), WATCHER_MS)
    this.tick()
  }

  stop() {
    this.playing = false
    if (this.timer) clearInterval(this.timer)
    if (this.watcher) clearInterval(this.watcher)
    this.timer = null
    this.watcher = null
    this.queue = []
    this.onStop()
  }

  private tick() {
    if (!this.ctx || !this.playing) return
    const pattern = this.getPattern()
    if (!pattern) return
    const spb = secondsPerStep(pattern.bpm)
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(pattern, this.ctx, this.master!, this.delaySend, this.noise!, this.step, this.nextStepTime)
      this.queue.push({ step: this.step, time: this.nextStepTime })
      this.nextStepTime += spb
      this.step = (this.step + 1) % STEPS
    }
  }

  private drainQueue() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    while (this.queue.length && this.queue[0].time <= now) {
      this.onStep(this.queue.shift()!.step)
    }
  }

  /** One-shot sound so users hear what a track does when they toggle cells. */
  preview(trackId: DrumTrackId | 'bass' | 'melody', pitchRow = 0) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime + 0.01
    const pattern = this.getPattern()
    const vol = pattern ? pattern.volumes[trackId] : 0.8
    if (trackId === 'kick') playKick(ctx, this.master!, t, vol)
    else if (trackId === 'snare') playSnare(ctx, this.master!, this.noise!, t, vol)
    else if (trackId === 'hihat') playHihat(ctx, this.master!, this.noise!, t, vol)
    else if (trackId === 'clap') playClap(ctx, this.master!, this.noise!, t, vol)
    else if (trackId === 'bass') playBass(ctx, this.master!, t, BASS_FREQS[Math.min(pitchRow, BASS_ROWS - 1)], 0.25, 0.8)
    else playMelody(ctx, this.master!, this.delaySend, t, MELODY_FREQS[Math.min(pitchRow, MELODY_ROWS - 1)], 0.25, 0.8)
  }

  /** Render `loops` repetitions of the pattern offline and return a WAV blob. */
  async renderWav(pattern: BeatPattern, loops = 4): Promise<Blob> {
    const spb = secondsPerStep(pattern.bpm)
    const duration = loops * STEPS * spb + 1.2
    const OfflineAC: typeof OfflineAudioContext = window.OfflineAudioContext
    const ctx = new OfflineAC(2, Math.ceil(44100 * duration), 44100)

    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(createBusCompressor(ctx)).connect(ctx.destination)

    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.29
    const fb = ctx.createGain()
    fb.gain.value = 0.3
    const dampen = ctx.createBiquadFilter()
    dampen.type = 'lowpass'
    dampen.frequency.value = 2200
    delay.connect(fb).connect(dampen).connect(delay)
    const send = ctx.createGain()
    send.gain.value = 0.25
    send.connect(delay)
    delay.connect(master)

    const noise = makeNoiseBuffer(ctx)

    for (let loop = 0; loop < loops; loop++) {
      for (let s = 0; s < STEPS; s++) {
        const t = 0.05 + (loop * STEPS + s) * spb
        scheduleStep(pattern, ctx, master, send, noise, s, t)
      }
    }

    const rendered = await ctx.startRendering()
    return audioBufferToWav(rendered)
  }
}
