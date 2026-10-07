/**
 * Learning domain model — shared by theory questions, scenarios, practice
 * driving and the mastery engine. Pure data: no React, no Three.js.
 *
 * IMPORTANT (product rule): no educational item may be marked `approved`
 * by code or by the developer. Approval is recorded only after review by a
 * qualified Norwegian driving instructor (trafikklærer), with name + date.
 */

/** Skills tracked by the mastery engine. */
export type SkillId =
  | 'trafficRules'
  | 'observation'
  | 'hazardAwareness'
  | 'riskUnderstanding'
  | 'speedAdaptation'
  | 'positioning'
  | 'cyclists'
  | 'pedestrians'
  | 'intersections'
  | 'roundabouts'

export const SKILLS: SkillId[] = [
  'trafficRules',
  'observation',
  'hazardAwareness',
  'riskUnderstanding',
  'speedAdaptation',
  'positioning',
  'cyclists',
  'pedestrians',
  'intersections',
  'roundabouts',
]

export const SKILL_LABELS: Record<SkillId, string> = {
  trafficRules: 'Trafikkregler',
  observation: 'Observasjon',
  hazardAwareness: 'Farer',
  riskUnderstanding: 'Risikoforståelse',
  speedAdaptation: 'Fartstilpasning',
  positioning: 'Plassering',
  cyclists: 'Syklister',
  pedestrians: 'Fotgjengere',
  intersections: 'Kryss',
  roundabouts: 'Rundkjøring',
}

/** Theory-test categories (grouping for the theory test and breakdowns). */
export type TheoryCategory = 'vikeplikt' | 'skilt' | 'myke-trafikanter' | 'fart-og-avstand' | 'risiko' | 'kryss-og-rundkjoring'

export const THEORY_CATEGORY_LABELS: Record<TheoryCategory, string> = {
  vikeplikt: 'Vikeplikt',
  skilt: 'Skilt og oppmerking',
  'myke-trafikanter': 'Myke trafikanter',
  'fart-og-avstand': 'Fart og avstand',
  risiko: 'Risiko og oppmerksomhet',
  'kryss-og-rundkjoring': 'Kryss og rundkjøring',
}

export type ProfessionalReviewStatus = 'draft' | 'review_requested' | 'approved' | 'needs_revision'

export const REVIEW_STATUS_LABELS: Record<ProfessionalReviewStatus, string> = {
  draft: 'Utkast',
  review_requested: 'Sendt til faglig vurdering',
  approved: 'Faglig godkjent',
  needs_revision: 'Må revideres',
}

export interface ReviewEvent {
  status: ProfessionalReviewStatus
  /** reviewer name + qualification, e.g. "Kari Nordmann, trafikklærer" — never set by code */
  by: string
  date: string
  note?: string
}

export interface SourceRef {
  publisher: 'Lovdata' | 'Statens vegvesen' | 'Trygg Trafikk' | 'Annet'
  title: string
  /** e.g. "Trafikkreglene § 7 nr. 1" */
  section?: string
  url: string
  /** how sure the content author is that the item matches the source; 'uncertain' MUST be checked by a reviewer */
  confidence: 'checked' | 'uncertain'
}

/** Visual attached to a question. Rendered by the UI (signs/diagrams are SVG, scenes are 3D frames). */
export type SceneRef =
  | { kind: 'sign'; sign: SignId }
  | { kind: 'diagram'; diagram: DiagramId; mirror?: boolean }
  | { kind: 'scenario'; scenarioId: string; stepId?: string }

export type SignId = 'vikeplikt' | 'stopp' | 'forkjorsvei' | 'forkjorsvei-slutt' | 'gangfelt' | 'fart30' | 'rundkjoring' | 'boligomrade' | 'barn'

/** Small top-down teaching diagrams (see ui/learn/Diagram.tsx). */
export type DiagramId =
  | 'kryss-hoyre' // you + car from the right in an unmarked junction
  | 'kryss-venstre' // you + car from the left (you have priority over it, still check)
  | 'kryss-forkjorsvei' // you on a priority road
  | 'gangfelt-fotgjenger'
  | 'sykkelfelt-hoyresving'
  | 'rundkjoring-utkjoring'
  | 'ball-barn'
  | 'avkjorsel'

export type QuestionType =
  | 'multiple_choice'
  | 'image_choice'
  | 'situational'
  | 'hazard_recognition'
  | 'ordering'
  | 'sign_recognition'
  | 'what_happens_next'
  | 'scene_linked'

export interface AnswerOption {
  id: string
  text: string
  scene?: SceneRef
}

export interface TheoryQuestion {
  id: string
  /** bump on any content change; review status resets to draft on a new version */
  version: number
  category: TheoryCategory
  topic: string
  subtopic: string
  difficulty: 1 | 2 | 3
  questionType: QuestionType
  prompt: string
  imageOrSceneReference?: SceneRef
  answerOptions: AnswerOption[]
  /** option id, or ordered option ids for 'ordering' */
  correctAnswer: string | string[]
  explanation: string
  /** why a learner might pick a wrong option (keyed by option id) — shown after a wrong answer */
  misconception?: Record<string, string>
  linkedScenarioIds: string[]
  learningObjectiveIds: string[]
  /** how strongly answering this question is evidence for each skill (0..1) */
  skills: Partial<Record<SkillId, number>>
  sourceMetadata: SourceRef[]
  professionalReviewStatus: ProfessionalReviewStatus
  reviewHistory: ReviewEvent[]
}

export interface LearningObjective {
  id: string
  text: string
  skills: SkillId[]
}

/** Interaction mode — the same world and simulation, different rules for help and scoring. */
export type ControlMode = 'learn' | 'practice' | 'exam'

export interface ControlModePolicy {
  hints: boolean
  answerButtons: boolean
  theoryPanel: boolean
  instructor: 'coach' | 'route-only' | 'silent-route'
  pauseAllowed: boolean
  /** record a full action log for the post-drive report */
  recordActions: boolean
  feedback: 'immediate' | 'after-drive'
}

export const CONTROL_MODES: Record<ControlMode, ControlModePolicy> = {
  // Guided decisions at key moments, theory one tap away, instant feedback.
  learn: { hints: true, answerButtons: true, theoryPanel: true, instructor: 'coach', pauseAllowed: true, recordActions: false, feedback: 'immediate' },
  // You drive yourself; an instructor gives route instructions and short coaching; assessment after the drive.
  practice: { hints: false, answerButtons: false, theoryPanel: false, instructor: 'route-only', pauseAllowed: true, recordActions: true, feedback: 'after-drive' },
  // Simulated test drive (training only): no hints, no answer buttons, route instructions only, full report afterwards.
  exam: { hints: false, answerButtons: false, theoryPanel: false, instructor: 'silent-route', pauseAllowed: false, recordActions: true, feedback: 'after-drive' },
}
