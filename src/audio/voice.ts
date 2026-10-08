/**
 * Instructor voice architecture (Norwegian, bokmål).
 *
 * Every spoken line has an id and a text. Resolution order when a line is
 * triggered:
 *   1. a recorded file listed in RECORDED (public/assets/voice/nb/<id>.mp3)
 *   2. the browser's speech synthesis, IF the user enabled read-aloud AND a
 *      Norwegian voice (nb/no/nn) is installed — never a foreign accent
 *   3. silence — the TEXT is always shown on screen (subtitles are the
 *      primary channel; audio is an enhancement)
 *
 * To add professional recordings: drop <id>.mp3 into public/assets/voice/nb/
 * and add the id to RECORDED. No code changes elsewhere.
 */

export interface VoiceLine {
  id: string
  text: string
  /** route instruction (all modes) vs coaching (learn/practice only) */
  kind: 'route' | 'coach' | 'feedback'
}

export const VOICE_LINES: VoiceLine[] = [
  { id: 'start', kind: 'route', text: 'Kjør rett fram. Fartsgrensen er 30.' },
  { id: 'turn', kind: 'route', text: 'I krysset tar du til venstre.' },
  { id: 'stop', kind: 'route', text: 'Kjør inn til høyre og stans ved postkassestativet.' },
  { id: 'coach-look', kind: 'coach', text: 'Uoversiktlig kryss – se til høyre.' },
  // library for upcoming routes (same voice, same system)
  { id: 'next-right', kind: 'route', text: 'I neste kryss tar du til høyre.' },
  { id: 'next-left', kind: 'route', text: 'I neste kryss tar du til venstre.' },
  { id: 'straight', kind: 'route', text: 'Fortsett rett fram.' },
  { id: 'pull-over', kind: 'route', text: 'Trekk inn til siden når det passer.' },
  { id: 'roundabout-2', kind: 'route', text: 'Ta andre avkjøring i rundkjøringen.' },
  { id: 'roundabout-3', kind: 'route', text: 'Ta tredje avkjøring i rundkjøringen.' },
  { id: 'done', kind: 'feedback', text: 'Takk, da er vi ferdige. La oss se på kjøringen.' },
]

const BY_ID = new Map(VOICE_LINES.map((l) => [l.id, l]))

/** ids that have a recorded file in public/assets/voice/nb/ */
const RECORDED = new Set<string>([])

const KEY = 'kjor-voice'

function norwegianVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  return speechSynthesis.getVoices().find((v) => /^(nb|no|nn)(-|_|$)/i.test(v.lang)) ?? null
}

export const voice = {
  get enabled() {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  },
  set enabled(on: boolean) {
    try {
      localStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (!on && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  },
  /** true when spoken output is possible at all on this device */
  get available() {
    return RECORDED.size > 0 || norwegianVoice() !== null
  },
  /** Speak a line (if enabled + possible). Returns the text so callers can always show it. */
  say(id: string, fallback?: string): string {
    const line = BY_ID.get(id)
    const text = line?.text ?? fallback ?? ''
    if (!this.enabled || !text) return text
    if (RECORDED.has(id)) {
      const a = new Audio(`${import.meta.env.BASE_URL ?? '/'}assets/voice/nb/${id}.mp3`)
      void a.play().catch(() => {})
      return text
    }
    const v = norwegianVoice()
    if (v) {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = v
      u.lang = v.lang
      u.rate = 1
      speechSynthesis.speak(u)
    }
    return text
  },
}
