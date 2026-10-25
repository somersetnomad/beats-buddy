export type DrumTrackId = 'kick' | 'snare' | 'hihat' | 'clap'
export type PitchTrackId = 'bass' | 'melody'
export type TrackId = DrumTrackId | PitchTrackId

export const DRUM_TRACKS: DrumTrackId[] = ['kick', 'snare', 'hihat', 'clap']
export const PITCH_TRACKS: PitchTrackId[] = ['bass', 'melody']
export const ALL_TRACKS: TrackId[] = [...DRUM_TRACKS, ...PITCH_TRACKS]

export const STEPS = 16
export const BASS_ROWS = 6
export const MELODY_ROWS = 8

export interface BeatPattern {
  bpm: number
  swing: number // 0..0.5, applied to 8th-note offbeats
  drums: Record<DrumTrackId, boolean[]>
  bass: boolean[][] // [pitchRow][step], row 0 = lowest pitch
  melody: boolean[][] // [pitchRow][step], row 0 = lowest pitch
  volumes: Record<TrackId, number> // 0..1
  muted: Record<TrackId, boolean>
}

export interface SavedBeat {
  id: string
  name: string
  createdAt: number
  prompt?: string
  pattern: BeatPattern
}

export interface TrackMeta {
  id: TrackId
  label: string
  emoji: string
  /** neon pad colour — the track's identity everywhere in the UI */
  color: string
  /** translucent tint of `color` for dim states on the dark stage */
  softColor: string
  /** one-line plain-language description for beginners */
  hint: string
}

export const TRACK_META: Record<TrackId, TrackMeta> = {
  kick: { id: 'kick', label: 'Kick', emoji: '🥊', color: '#FF4D6D', softColor: 'rgba(255,77,109,0.16)', hint: 'The big thump. Your heartbeat.' },
  snare: { id: 'snare', label: 'Snare', emoji: '🥁', color: '#FF9F1C', softColor: 'rgba(255,159,28,0.16)', hint: 'The crack on 2 and 4.' },
  hihat: { id: 'hihat', label: 'Hi-hat', emoji: '🎩', color: '#F9F871', softColor: 'rgba(249,248,113,0.14)', hint: 'The ticking that keeps time.' },
  clap: { id: 'clap', label: 'Clap', emoji: '👏', color: '#2DF5C4', softColor: 'rgba(45,245,196,0.14)', hint: 'Hands in the air.' },
  bass: { id: 'bass', label: 'Bass', emoji: '🎸', color: '#8B5CFF', softColor: 'rgba(139,92,255,0.18)', hint: 'Low notes you feel in your chest.' },
  melody: { id: 'melody', label: 'Melody', emoji: '🎹', color: '#FF5CD6', softColor: 'rgba(255,92,214,0.16)', hint: 'The tune people hum later.' },
}
