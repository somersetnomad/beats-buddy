import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { sanitizePattern } from '@/lib/beat/patterns'
import { fallbackPattern, BEAT_PROMPT as SYSTEM_PROMPT } from '@/lib/beat/vibes'

export const runtime = 'nodejs'
export const maxDuration = 60


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
