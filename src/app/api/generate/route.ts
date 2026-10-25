import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { sanitizePattern } from '@/lib/beat/patterns'
import { fallbackPattern } from '@/lib/beat/vibes'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a beat-pattern generator for a 16-step sequencer (one bar of 16th notes).
Respond with ONLY valid JSON — no markdown fences, no commentary — matching exactly:
{"bpm": <int 60-180>, "swing": <number 0-0.5>, "kick": [16 booleans], "snare": [16 booleans], "hihat": [16 booleans], "clap": [16 booleans], "bass": [6 rows x 16 booleans], "melody": [8 rows x 16 booleans]}

Pitch rows go LOW to HIGH (row 0 = lowest):
- bass rows: C2, D#2, F2, G2, A#2, C3
- melody rows: C4, D#4, F4, G4, A#4, C5, D#5, F5 (C minor pentatonic)

Rules for a musical result:
- kick almost always hits step 0
- snare and/or clap usually on steps 4 and 12 (half-time: only step 8)
- hihat drives the groove; add rolls for trap energy
- keep bass 3-6 notes, melody 3-7 notes — sparse and catchy, never every step
- match the requested vibe, tempo and energy
Example shape (do not copy content): {"bpm":90,"swing":0.14,"kick":[1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"hihat":[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],"clap":[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],"bass":[[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],"melody":[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]}`

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, '```').trim()
  const fenced = cleaned.match(/```([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : cleaned
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found')
  return JSON.parse(candidate.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  let prompt = ''
  try {
    const body = await req.json()
    prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 300) : ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Describe your vibe first — e.g. "lo-fi chill with rain"' }, { status: 400 })
  }

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: `Vibe: "${prompt}". Generate the beat pattern JSON now.` },
      ],
      thinking: { type: 'disabled' },
    })
    const text = completion.choices[0]?.message?.content ?? ''
    const raw = extractJson(text)
    const pattern = sanitizePattern(raw, fallbackPattern(prompt))
    return NextResponse.json({ pattern, source: 'ai' })
  } catch (err) {
    console.error('[api/generate] AI generation failed, using fallback:', err)
    return NextResponse.json({ pattern: fallbackPattern(prompt), source: 'fallback' })
  }
}
