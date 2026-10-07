import type { ScenarioContent, ScenarioDef } from '../engine/types'
import { s1 } from './s1-hoyreregel'
import { s2 } from './s2-ballen'
import { s3 } from './s3-syklisten'
import { s4 } from './s4-gangfelt'
import { s5 } from './s5-rushtrafikk'
import { s1Content } from '../content/scenarios/s1-hoyreregel'
import { s2Content } from '../content/scenarios/s2-ballen'
import { s3Content } from '../content/scenarios/s3-syklisten'
import { s4Content } from '../content/scenarios/s4-gangfelt'
import { s5Content } from '../content/scenarios/s5-rushtrafikk'

export const SCENARIOS: ScenarioDef[] = [s1, s2, s3, s4, s5]

export const CONTENT: Record<string, ScenarioContent> = Object.fromEntries(
  [s1Content, s2Content, s3Content, s4Content, s5Content].map((c) => [c.id, c]),
)

export function scenarioById(id: string) {
  return SCENARIOS.find((s) => s.id === id)
}
