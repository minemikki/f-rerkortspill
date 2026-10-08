import type { Path } from './path'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SCENARIO DATA MODEL
 *
 *  A scenario is split in two parts:
 *   1. Choreography (src/scenarios/*.ts) — actors, paths, timing, branches.
 *      Owned by game design / engineering.
 *   2. Faglig innhold (src/content/scenarios/*.ts) — every text the player
 *      reads, the traffic rules referenced, and the review status.
 *      Owned by a qualified Norwegian driving instructor before launch.
 *
 *  Both halves share ids (step ids, option ids, outcome ids, actor ids) so the
 *  type checker ensures nothing is missing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Category = 'observation' | 'risk' | 'rules' | 'reaction'
export const CATEGORIES: Category[] = ['observation', 'risk', 'rules', 'reaction']

export type ActorKind = 'car' | 'van' | 'bus' | 'cyclist' | 'pedestrian' | 'child' | 'ball'

export type Pose = 'auto' | 'idle' | 'walk' | 'run' | 'phone' | 'look' | 'wave' | 'recoil' | 'crouch'

export type SoundId =
  | 'horn'
  | 'bell'
  | 'screech'
  | 'whoosh'
  | 'ballBounce'
  | 'kidShout'
  | 'tick'

/** One instruction in an actor's speed program. */
export interface SpeedCmd {
  /** Seconds. Absolute in actor programs, relative to the resolving moment in outcomes/setups. */
  at: number
  /** Target cruise speed (m/s). */
  v?: number
  /** Max acceleration while speeding up (m/s²). */
  accel?: number
  /** Max deceleration while slowing down (m/s²). For stopAt: preferred braking decel. */
  decel?: number
  /** Stop exactly at this path distance (metres). */
  stopAt?: number
  /** Teleport to this path distance. */
  setS?: number
  /** Set speed instantly. */
  setV?: number
  /** Treat `at` as absolute sim time even inside outcomes (for choreography that must line up with other actors). */
  abs?: boolean
}

export interface ActorDef {
  id: string
  kind: ActorKind
  path: Path
  /** Initial distance along path. */
  s0?: number
  /** Initial speed. */
  v0?: number
  program?: SpeedCmd[]
  color?: string
  /** Car-following on the same path (simple IDM). */
  follow?: { leader: string; gap: number; headway?: number }
  visible?: boolean
  /** Visual variant (clothing etc). */
  variant?: number
  /** Indicator active from start. */
  indicator?: 'left' | 'right' | 'hazard' | null
  /** Car pulled over / parked: no driver motion. */
  parked?: boolean
}

export type Cue =
  | { at: number; type: 'indicator'; actor: string; side: 'left' | 'right' | 'hazard' | null }
  | { at: number; type: 'pose'; actor: string; pose: Pose }
  | { at: number; type: 'face'; actor: string; heading: number | null }
  | { at: number; type: 'visible'; actor: string; visible: boolean }
  | { at: number; type: 'sound'; sound: SoundId; actor?: string }
  | { at: number; type: 'camera'; shot: CameraShot | null }
  | { at: number; type: 'mark'; label: string }

export type CameraShot =
  | {
      kind: 'chase'
      /** metres behind the player */
      back?: number
      /** metres above the ground */
      up?: number
      /** look-at distance ahead of the player */
      ahead?: number
      /** sideways offset (positive = right) */
      side?: number
      fov?: number
    }
  | { kind: 'fixed'; pos: [number, number, number]; target: [number, number, number]; fov?: number }
  | {
      /** Orbit around a point, used for hero / replays */
      kind: 'orbit'
      target: [number, number, number]
      radius: number
      height: number
      angle: number
      speed?: number
      fov?: number
    }

export type Trigger = { time: number } | { playerS: number }

export type OutcomeResult = 'perfect' | 'good' | 'partial' | 'wrong'

export type BadgeId = 'perfect-awareness' | 'sharp-eyes' | 'early-reaction' | 'rule-master' | 'smooth-operator' | 'boss-city'

export interface Outcome {
  id: string
  result: OutcomeResult
  /** 0..1 per category that this step tests. */
  scores: Partial<Record<Category, number>>
  xp: number
  badge?: BadgeId
  /** Speed program changes, relative to the resolve moment. Replaces each actor's future program. */
  commands?: Record<string, SpeedCmd[]>
  cues?: Cue[]
  /** Sim seconds the outcome plays before the scenario moves on. */
  duration: number
  /** Near-miss moment (relative). Triggers freeze → replay → feedback. */
  freezeAt?: number
  /** When to show the (non-blocking) feedback toast for positive outcomes. */
  feedbackAt?: number
  /** Actors to highlight in feedback / replay. */
  highlight?: string[]
  /** Replay camera override. */
  replayShot?: CameraShot
}

interface StepBase {
  id: string
  trigger: Trigger
  tests: Category[]
  /** Applied when the step triggers. Relative times. */
  setup?: { commands?: Record<string, SpeedCmd[]>; cues?: Cue[] }
  /** Camera during the interaction. */
  camera?: CameraShot
  /** Actors the camera must keep in frame during the step (camera "director"). */
  focus?: string[]
  /** Time scale while waiting for input (default 0.05). */
  slowmo?: number
}

export interface ChoiceStep extends StepBase {
  kind: 'choice'
  /** Real seconds to answer. */
  timeLimit: number
  options: { id: string; outcome: Outcome }[]
  /** Option used if time runs out (usually "do nothing" = keep driving). */
  timeoutOption: string
}

export interface SpotStep extends StepBase {
  kind: 'spot'
  timeLimit: number
  targets: string[]
  distractors: string[]
  outcomes: {
    all: Outcome
    /** Exactly one target missed → specific consequence. */
    missed?: Record<string, Outcome>
    none: Outcome
  }
}

export interface ReactionStep extends StepBase {
  kind: 'reaction'
  /**
   * Brake windows relative to the trigger: the first window whose `until` is
   * later than the press time decides the outcome.
   */
  windows: { until: number; outcome: string }[]
  /** If no press by this relative time → `fail` outcome. */
  failAt: number
  outcomes: Record<string, Outcome> & { fail: Outcome }
}

export type Step = ChoiceStep | SpotStep | ReactionStep

export type EnvironmentId = 'boliggate-kryss' | 'boliggate-rett' | 'bygate-sving' | 'gangfelt' | 'rundkjoring' | 'hero'

export interface ScenarioDef {
  id: string
  environment: EnvironmentId
  /** Lighting mood. */
  mood: 'morning' | 'day' | 'overcast' | 'golden'
  actors: ActorDef[]
  cues?: Cue[]
  steps: Step[]
  end: Trigger
  camera: CameraShot
  /** Bonus XP for completing the scenario. */
  completionXp: number
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Mechanics showcased — used by the map / analytics. */
  mechanics: Array<'choice' | 'spot' | 'reaction' | 'priority' | 'route' | 'lights' | 'speed' | 'scan'>
  boss?: boolean
}

/* ───────────────────────── Faglig innhold ───────────────────────── */

export type ReviewStatus = 'utkast' | 'til-gjennomgang' | 'godkjent'

export interface RuleRef {
  /** Short rule statement shown to players. */
  text: string
  /** Source the statement is based on. */
  source: string
  /** Has the developer verified the statement against the source? Reviewer must still approve. */
  verifiedByDev: boolean
}

export interface OutcomeContent {
  title: string
  body: string
  /** "DU SÅ …" part of mistake feedback. */
  saw?: string
  /** "MEN DU OVERSÅ …" part of mistake feedback. */
  missed?: string
  /** Optional two-line teaching caption shown during the replay (overrides saw/missed), e.g. ["Ballen var varselet.", "Barnet kom etter."] */
  replay?: [string, string]
}

export interface StepContent {
  prompt: string
  hint?: string
  options?: Record<string, string>
  /** Labels for tappable actors (spot steps). */
  labels?: Record<string, string>
  outcomes: Record<string, OutcomeContent>
}

export interface ScenarioContent {
  id: string
  title: string
  /** One short line shown on the intro card. */
  tagline: string
  learningObjective: string
  steps: Record<string, StepContent>
  /** The single takeaway shown on the result screen. */
  takeaway: string
  rules: RuleRef[]
  review: {
    status: ReviewStatus
    reviewer: string | null
    date: string | null
    notes: string
  }
}
