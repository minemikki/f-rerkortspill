import type { ScenarioContent, ScenarioDef } from '../../engine/types'

const KIND_LABEL: Record<string, string> = {
  car: 'bilen',
  van: 'varebilen',
  bus: 'bussen',
  cyclist: 'syklisten',
  pedestrian: 'fotgjengeren',
  child: 'barnet',
  ball: 'ballen',
}

/** Player-facing label for an actor (content labels override the generic kind label). */
export function actorLabel(def: ScenarioDef, content: ScenarioContent, actorId: string) {
  for (const s of Object.values(content.steps)) {
    const l = s.labels?.[actorId]
    if (l) return l
  }
  const a = def.actors.find((x) => x.id === actorId)
  return a ? (KIND_LABEL[a.kind] ?? actorId) : actorId
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
