/**
 * Norwegian traffic signs and road markings used by the game, checked against
 * Skiltforskriften (FOR-2005-10-07-1219, lovdata.no) on 2026-10-08.
 * Every «Skilt NNN …» citation in the content must match this list (tested),
 * and every sign drawn in 3D maps to one entry. See docs/SIGNAGE_AUDIT.md.
 */
export interface SignEntry {
  no: string
  name: string
  group: 'vikeplikt' | 'forbud' | 'opplysning' | 'fare' | 'påbud' | 'oppmerking'
  /** shown in the 3D world */
  inWorld: boolean
}

export const SIGNS: SignEntry[] = [
  { no: '202', name: 'Vikeplikt', group: 'vikeplikt', inWorld: true },
  { no: '204', name: 'Stopp', group: 'vikeplikt', inWorld: false },
  { no: '206', name: 'Forkjørsveg', group: 'vikeplikt', inWorld: false },
  { no: '208', name: 'Slutt på forkjørsveg', group: 'vikeplikt', inWorld: false },
  { no: '362', name: 'Fartsgrense', group: 'forbud', inWorld: true },
  { no: '366', name: 'Fartsgrensesone', group: 'forbud', inWorld: false },
  { no: '512', name: 'Holdeplass for buss', group: 'opplysning', inWorld: true },
  { no: '516', name: 'Gangfelt', group: 'opplysning', inWorld: true },
  { no: '522', name: 'Gang- og sykkelveg', group: 'påbud', inWorld: false },
  { no: '1002', name: 'Varsellinje', group: 'oppmerking', inWorld: true },
  { no: '1004', name: 'Sperrelinje', group: 'oppmerking', inWorld: true },
  { no: '1008', name: 'Skillelinje', group: 'oppmerking', inWorld: true },
  { no: '1012', name: 'Kantlinje', group: 'oppmerking', inWorld: true },
  { no: '1022', name: 'Vikelinje', group: 'oppmerking', inWorld: true },
  { no: '1024', name: 'Gangfelt', group: 'oppmerking', inWorld: true },
]

export const SIGN_BY_NO = new Map(SIGNS.map((s) => [s.no, s]))

/** Parse «Skilt 206 Forkjørsveg» → entry, or null when the number/name doesn't match the regulation. */
export function checkSignCitation(text: string): SignEntry | null {
  const m = /^Skilt (\d{3,4}(?:\.\d)?) (.+)$/.exec(text.trim())
  if (!m) return null
  const e = SIGN_BY_NO.get(m[1])
  return e && e.name.toLowerCase() === m[2].toLowerCase() ? e : null
}
