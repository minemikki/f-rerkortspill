import type { BadgeId } from '../engine/types'

/** Journey structure. Scenario ids must exist in src/scenarios/index.ts. */
export interface WorldDef {
  id: string
  index: number
  title: string
  subtitle: string
  scenarios: string[]
  locked: boolean
  theme: 'city' | 'country' | 'dark' | 'winter' | 'motorway'
  teaser: string
}

export const WORLDS: WorldDef[] = [
  {
    id: 'byen',
    index: 1,
    title: 'Byen',
    subtitle: 'Vikeplikt, myke trafikanter og rundkjøring',
    scenarios: ['s1-hoyreregel', 's2-ballen', 's3-syklisten', 's4-gangfelt', 's5-rushtrafikk'],
    locked: false,
    theme: 'city',
    teaser: '',
  },
  {
    id: 'landevei',
    index: 2,
    title: 'Landevei',
    subtitle: 'Forbikjøring, elg og svinger',
    scenarios: [],
    locked: true,
    theme: 'country',
    teaser: 'Fullfør Byen for å låse opp',
  },
  {
    id: 'morket',
    index: 3,
    title: 'Mørket',
    subtitle: 'Fjernlys, refleks og nedblending',
    scenarios: [],
    locked: true,
    theme: 'dark',
    teaser: 'Krever Landevei',
  },
  {
    id: 'vinter',
    index: 4,
    title: 'Vinter',
    subtitle: 'Glatt føre, brøytekanter og bremselengde',
    scenarios: [],
    locked: true,
    theme: 'winter',
    teaser: 'Krever Mørket',
  },
  {
    id: 'motorvei',
    index: 5,
    title: 'Motorvei',
    subtitle: 'Påkjøring, feltskifte og avstand',
    scenarios: [],
    locked: true,
    theme: 'motorway',
    teaser: 'Krever Vinter',
  },
]

export const BADGES: Record<BadgeId, { title: string; desc: string; icon: string }> = {
  'perfect-awareness': { title: 'Perfekt risikoforståelse', desc: 'Reagerte på faresignalet før faren kom', icon: '◎' },
  'sharp-eyes': { title: 'Skarpt blikk', desc: 'Fant alle farene uten bom', icon: '◉' },
  'early-reaction': { title: 'Lynrask', desc: 'Bremset før det ble kritisk', icon: '⚡' },
  'rule-master': { title: 'Regelsterk', desc: 'Kunne vikeplikten', icon: '▲' },
  'smooth-operator': { title: 'Myk sjåfør', desc: 'Tilpasset farten i god tid', icon: '≈' },
  'boss-city': { title: 'Bykjører', desc: 'Klarte rushtrafikken med 80 %+', icon: '★' },
}

export const CATEGORY_LABELS = {
  observation: 'Observasjon',
  risk: 'Risikoforståelse',
  rules: 'Trafikkregler',
  reaction: 'Reaksjon',
} as const
