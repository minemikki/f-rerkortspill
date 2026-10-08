import { obbGap, type ActorRuntime } from '../engine/sim'
import { CONTROL_MODES, type ControlMode } from '../learning/types'
import { KRYSS } from '../scenarios/layouts'
import { VOICE_LINES } from '../audio/voice'

/**
 * PRACTICE DRIVING — vertical slice (S1 residential junction).
 *
 * You drive yourself. An instructor gives route instructions ("I krysset
 * tar du til venstre"), the evaluator watches what you actually do, and a
 * KJØREVURDERING is produced afterwards.
 *
 * Deterministic: fixed 60 Hz step, no randomness → the same inputs always
 * give the same drive and the same assessment (unit tested headlessly).
 *
 * Coordinates as the scenario engine: metres, heading h with forward =
 * (sin h, cos h). Start: south arm, x = +1.5, heading −z (h = π).
 *
 * The route: approach the unmarked junction → turn LEFT into the west arm
 * (Trafikkreglene § 7 nr. 2: when turning left you yield to vehicles that
 * will be on your right) → a pedestrian crosses the road you turn into
 * (§ 7 nr. 3) → pull in to the right and stop.
 */

const R = KRYSS.roadHalf
export const DT = 1 / 60
export const LIMIT = 30 / 3.6
const WHEELBASE = 2.62
const CAR_LEN = 4.4
const CAR_WID = 1.8

export interface Controls {
  throttle: number // 0..1
  brake: number // 0..1
  steer: number // -1 (right) .. +1 (left)
}

export interface VehicleState {
  x: number
  z: number
  h: number
  v: number
  a: number
  steer: number
}

export type Indicator = 'left' | 'right' | null

/* ───────────── vehicle ───────────── */

/** Predictable kinematic bicycle model: no drifting, no race physics. */
export function stepVehicle(s: VehicleState, c: Controls, dt: number): VehicleState {
  const maxSteer = 0.6 / (1 + s.v / 10) // less lock at speed
  const target = Math.max(-1, Math.min(1, c.steer)) * maxSteer
  const rate = 1.8 * dt
  const steer = s.steer + Math.max(-rate, Math.min(rate, target - s.steer))
  const drive = c.throttle * 2.6 * Math.max(0, 1 - s.v / 16)
  const brake = c.brake * 7.5
  const resist = 0.12 + 0.012 * s.v * s.v
  let a = drive - (s.v > 0 ? brake + resist : 0)
  let v = s.v + a * dt
  if (v < 0) {
    v = 0
    a = 0
  }
  const h = s.h + (v / WHEELBASE) * Math.tan(steer) * dt
  return { x: s.x + Math.sin(h) * v * dt, z: s.z + Math.cos(h) * v * dt, h, v, a, steer }
}

/* ───────────── road users ───────────── */

export interface Mover {
  id: string
  kind: 'car' | 'pedestrian'
  x: number
  z: number
  h: number
  v: number
  vTarget: number
  active: boolean
  stoppedFor: boolean
}

const asActor = (x: number, z: number, h: number, len: number, wid: number) => ({ view: { x, z, h }, len, wid }) as unknown as ActorRuntime

export function gapBetween(a: { x: number; z: number; h: number }, al: number, aw: number, b: { x: number; z: number; h: number }, bl: number, bw: number) {
  return obbGap(asActor(a.x, a.z, a.h, al, aw), asActor(b.x, b.z, b.h, bl, bw))
}

/* ───────────── instructor + evaluation ───────────── */

export type Area = 'observation' | 'speedAdaptation' | 'positioning' | 'trafficRules'
export const AREA_LABELS: Record<Area, string> = {
  observation: 'Observasjon',
  speedAdaptation: 'Fartstilpasning',
  positioning: 'Plassering',
  trafficRules: 'Trafikkregler',
}

/**
 * Coaching text per fault: WHAT happened is the event text, then WHY it
 * mattered and WHAT to practise. Rule references: Trafikkreglene (Lovdata),
 * draft — to be reviewed by a trafikklærer with the thresholds (see /#/faglig).
 */
export const COACH: Record<string, { why: string; practice: string }> = {
  approach: {
    why: 'Hekken skjulte sidevegen. Med den farten hadde du ikke tid til å se deg om – eller til å stanse hvis en bil kom fra høyre.',
    practice: 'Senk farten tidlig der du ikke ser inn i sidevegen, og se til høyre før du kjører inn i krysset.',
  },
  speeding: {
    why: 'I boligfelt er marginene små. Ved 30 km/t er stopplengden omtrent halvparten av ved 50 km/t.',
    practice: 'Hold blikket på speedometeret i starten, og la bilen rulle uten gass når du nærmer deg fartsgrensen.',
  },
  harsh: {
    why: 'Brå bremsing kan overraske trafikken bak deg og viser at du så faren sent.',
    practice: 'Se lenger fram, og slipp gassen i god tid før kryss og svinger.',
  },
  'wrongside-a': {
    why: 'Møtende trafikk forventer ikke å møte deg der – og du får mindre tid hvis noen kommer rundt hjørnet.',
    practice: 'Sikt mot midten av ditt eget kjørefelt, ikke mot midten av vegen.',
  },
  'wrongside-b': {
    why: 'Etter en venstresving skal du havne i høyre side av den nye vegen. Ellers kommer du rett mot møtende trafikk.',
    practice: 'Se dit du skal (inn i ditt eget felt) allerede midt i svingen.',
  },
  'kerb-a': {
    why: 'Helt ute ved kanten har du lite rom hvis noen går ut fra fortauet eller en dør åpnes.',
    practice: 'Hold omtrent en halv meter fra kanten.',
  },
  signal: {
    why: 'Andre trafikanter – også gående – skal kunne se hva du skal gjøre i god tid.',
    practice: 'Gi tegn før du begynner å bremse ned til svingen.',
  },
  yield: {
    why: 'Når du svinger til venstre, har du vikeplikt for kjøretøy som kommer fra høyre (trafikkreglene § 7 nr. 2). Bilen måtte bremse for deg.',
    practice: 'Stans før krysset, la bilen fra høyre passere, og sving først når vegen er fri.',
  },
  walker: {
    why: 'Den som svinger, har vikeplikt for gående som skal rett fram (trafikkreglene § 7 nr. 3).',
    practice: 'Se etter gående i vegen du skal svinge inn i – før du starter svingen.',
  },
  lookRight: {
    why: 'Hekken skjulte sidevegen, og trafikk fra høyre kunne komme uten at du så den.',
    practice: 'Trykk «Se ▶» (E) når du nærmer deg et uoversiktlig kryss – helst to ganger: tidlig, og like før du kjører inn.',
  },
  lookLeft: {
    why: 'Når du svinger inn i en ny veg, kan det komme trafikk og gående fra venstre også.',
    practice: 'Se høyre – venstre – høyre før du kjører inn i krysset.',
  },
  lane: {
    why: 'Ujevn plassering gjør det vanskelig for andre å forstå hvor du skal.',
    practice: 'Se langt fram i ditt eget felt – bilen følger blikket.',
  },
  stopPos: {
    why: 'En bil som står langt ut i vegen tvinger andre til å kjøre rundt.',
    practice: 'Rull sakte inn mot høyre kant og stans parallelt med den.',
  },
  collision: {
    why: 'En kollisjon betyr at observasjon, fart og vikeplikt sviktet samtidig.',
    practice: 'Kjør igjen sakte, og øv på å se til begge sider før du kjører inn.',
  },
}

export interface DriveEvent {
  /** WHY it mattered + WHAT to practise (faults only) — see COACH */
  why?: string
  practice?: string
  t: number
  area: Area
  /** positive = good practice, negative = fault */
  kind: 'good' | 'minor' | 'major' | 'critical'
  text: string
  x: number
  z: number
}

export interface Instruction {
  id: string
  text: string
  /** coaching nudge (learn/practice) vs route instruction (all modes) */
  coach?: boolean
  at: number
}

export interface Observation {
  t: number
  side: 'left' | 'right'
  /** metres before the junction edge (negative = already in/after it) */
  before: number
}

export interface Assessment {
  areas: Record<Area, number>
  total: number
  events: DriveEvent[]
  completed: boolean
  reason: 'stopped' | 'collision' | 'wrong-way' | 'timeout'
  duration: number
  mode: ControlMode
  observations?: Observation[]
}

type Seg = 'approach' | 'junction' | 'exit' | 'stopzone' | 'done'

export interface DriveFlags {
  lookedRight: boolean
  lookedLeft: boolean
  indicated: boolean
  maxApproachV: number
  speedingT: number
  wrongSideT: number
  kerbT: number
  laneErr: number
  laneN: number
  stopT: number
  harshT: number
  carBraked: boolean
  walkerConflict: boolean
}

export class PracticeSession {
  readonly mode: ControlMode
  t = 0
  player: VehicleState = { x: 1.5, z: 42, h: Math.PI, v: 0, a: 0, steer: 0 }
  controls: Controls = { throttle: 0, brake: 0, steer: 0 }
  indicator: Indicator = null
  /** -1 look left, +1 look right (head check), 0 forward */
  look: -1 | 0 | 1 = 0
  car: Mover = { id: 'car-right', kind: 'car', x: 44, z: -1.5, h: -Math.PI / 2, v: 0, vTarget: 7, active: false, stoppedFor: false }
  walker: Mover = { id: 'walker', kind: 'pedestrian', x: -4.6, z: 15, h: Math.PI, v: 0, vTarget: 1.3, active: false, stoppedFor: false }
  events: DriveEvent[] = []
  instruction: Instruction | null = null
  seg: Seg = 'approach'
  finished: Assessment | null = null
  paused = false
  /**
   * Where did the player look? Every head check is logged with its distance
   * to the junction — groundwork for evaluating the observation SEQUENCE
   * (e.g. right → left → right before entering), not just its presence.
   */
  observations: Observation[] = []
  private lastLook: -1 | 0 | 1 = 0
  private indicatorHeading: number | null = null

  private acc = 0
  private said = new Set<string>()
  readonly flags: DriveFlags = { lookedRight: false, lookedLeft: false, indicated: false, maxApproachV: 0, speedingT: 0, wrongSideT: 0, kerbT: 0, laneErr: 0, laneN: 0, stopT: 0, harshT: 0, carBraked: false, walkerConflict: false }

  constructor(mode: ControlMode = 'practice') {
    this.mode = mode
    this.say('start')
  }

  get policy() {
    return CONTROL_MODES[this.mode]
  }

  setControls(c: Partial<Controls>) {
    Object.assign(this.controls, c)
  }

  update(dtReal: number) {
    if (this.paused || this.finished) return
    this.acc += Math.min(dtReal, 0.1)
    while (this.acc >= DT) {
      this.acc -= DT
      this.step()
      if (this.finished) break
    }
  }

  /** instructor line by id — the text lives in audio/voice.ts (single source for subtitles + voice) */
  private say(id: string, coach = false) {
    if (this.said.has(id)) return
    const text = VOICE_LINES.find((l) => l.id === id)?.text ?? id
    if (coach && this.policy.instructor !== 'coach' && this.policy.instructor !== 'route-only') return
    if (coach && this.mode === 'exam') return
    this.said.add(id)
    this.instruction = { id, text, coach, at: this.t }
  }

  private log(area: Area, kind: DriveEvent['kind'], text: string, key?: string, coach?: string) {
    if (key) {
      if (this.said.has('ev:' + key)) return
      this.said.add('ev:' + key)
    }
    const c = kind !== 'good' ? COACH[coach ?? key ?? ''] : undefined
    this.events.push({ t: Math.round(this.t * 10) / 10, area, kind, text, x: this.player.x, z: this.player.z, why: c?.why, practice: c?.practice })
  }

  step() {
    const p0 = this.player
    this.t += DT
    const p = (this.player = stepVehicle(p0, this.controls, DT))
    const kmh = p.v * 3.6

    /* --- route / instructor --- */
    if (this.seg === 'approach') {
      if (p.z < 34) this.say('turn')
      if (p.z < 22 && !this.car.active) {
        // Choreography: the hidden car reaches the junction just after you would at
        // your current speed — fast or slow, you meet it (that is the lesson).
        const tArrive = (p.z - R) / Math.max(p.v, 3)
        this.car.x = Math.min(44, R + (tArrive + 0.7) * 7)
        this.car.active = true
        this.car.v = 7
        this.walker.active = true
        this.walker.v = 1.3
      }
      if (p.z < 18 && !this.flags.lookedRight) this.say('coach-look', true)
      if (p.z < R + 0.6) this.seg = 'junction'
    } else if (this.seg === 'junction') {
      if (p.x < -R - 1) {
        this.seg = 'exit'
        this.say('stop')
      } else if (p.z < -R - 2) {
        this.log('trafficRules', 'minor', 'Du kjørte rett fram – instruktøren ba deg ta til venstre.')
        return this.finish('wrong-way')
      } else if (p.x > R + 2) {
        this.log('trafficRules', 'minor', 'Du tok til høyre – instruktøren ba deg ta til venstre.')
        return this.finish('wrong-way')
      }
    } else if (this.seg === 'exit') {
      if (p.x < -30) this.seg = 'stopzone'
    }

    /* --- head-check log (sequence) --- */
    if (this.look !== this.lastLook && this.look !== 0) {
      this.observations.push({ t: Math.round(this.t * 10) / 10, side: this.look > 0 ? 'right' : 'left', before: Math.round((this.seg === 'approach' ? p.z - R : -1) * 10) / 10 })
    }
    this.lastLook = this.look

    /* --- indicator self-cancels after the turn, like a real car --- */
    if (this.indicator) {
      if (this.indicatorHeading === null) this.indicatorHeading = p.h
      let dh = p.h - this.indicatorHeading
      while (dh > Math.PI) dh -= Math.PI * 2
      while (dh < -Math.PI) dh += Math.PI * 2
      if (Math.abs(dh) > 1.1 && Math.abs(this.controls.steer) < 0.2) {
        this.indicator = null
        this.indicatorHeading = null
      }
    } else this.indicatorHeading = null

    /* --- observation --- */
    if (this.seg === 'approach' && p.z < 30) {
      if (this.look === 1 && !this.flags.lookedRight) {
        this.flags.lookedRight = true
        this.log('observation', 'good', 'Du så til høyre før krysset.')
      }
      if (this.look === -1 && !this.flags.lookedLeft) {
        this.flags.lookedLeft = true
        this.log('observation', 'good', 'Du så til venstre før krysset.')
      }
    }
    if ((this.seg === 'approach' || this.seg === 'junction') && p.z < 30 && this.indicator === 'left' && !this.flags.indicated) {
      if (p.z > R + 4) {
        this.flags.indicated = true
        this.log('trafficRules', 'good', 'Du ga tegn i god tid før du svingte.')
      }
    }
    if (this.seg === 'junction' && !this.flags.indicated && p.h > Math.PI + 0.35) {
      this.flags.indicated = true // only report once
      this.log('trafficRules', 'minor', 'Du svingte uten å gi tegn i god tid.', undefined, 'signal')
    }

    /* --- speed --- */
    if (kmh > 33) {
      this.flags.speedingT += DT
      if (this.flags.speedingT > 1) this.log('speedAdaptation', 'minor', 'Du kjørte over fartsgrensen (30 km/t).', 'speeding')
    }
    if (this.seg === 'approach' && p.z < R + 9 && p.z > R) this.flags.maxApproachV = Math.max(this.flags.maxApproachV, kmh)
    if (this.seg === 'approach' && p.z <= R + 0.7 && !this.said.has('ev:approach')) {
      const v = Math.round(this.flags.maxApproachV)
      if (v > 22) this.log('speedAdaptation', 'major', `Du kom inn mot krysset i ${v} km/t – for fort.`, 'approach')
      else this.log('speedAdaptation', 'good', `Du senket farten til ${v} km/t inn mot det uoversiktlige krysset.`, 'approach')
    }
    if (p.a < -6.2) {
      this.flags.harshT += DT
      if (this.flags.harshT > 0.4) this.log('speedAdaptation', 'minor', 'Du bremset brått.', 'harsh')
    }

    /* --- positioning --- */
    if (this.seg === 'approach' && p.z > R + 4) {
      const err = p.x - 1.5
      this.flags.laneErr += Math.abs(err)
      this.flags.laneN++
      if (p.x < 0.55) {
        this.flags.wrongSideT += DT
        if (this.flags.wrongSideT > 0.8) this.log('positioning', 'major', 'Du kjørte over midten av vegen.', 'wrongside-a')
      }
      if (p.x > R - CAR_WID / 2 + 0.1) {
        this.flags.kerbT += DT
        if (this.flags.kerbT > 0.3) this.log('positioning', 'minor', 'Du var helt ute ved fortauskanten.', 'kerb-a')
      }
    }
    if (this.seg === 'exit' || this.seg === 'stopzone') {
      // heading −x: right side is −z, lane centre z = −1.5
      if (p.x < -R - 4) {
        this.flags.laneErr += Math.abs(p.z + 1.5)
        this.flags.laneN++
      }
      if (p.z > -0.55 && p.x < -R - 3) {
        this.flags.wrongSideT += DT
        if (this.flags.wrongSideT > 0.8) this.log('positioning', 'major', 'Etter svingen havnet du i venstre side av vegen.', 'wrongside-b')
      }
    }

    /* --- other road users --- */
    this.updateCar(p)
    this.updateWalker(p)
    if (this.finished) return

    /* --- finish: stopped in the stop zone --- */
    if (this.seg === 'stopzone') {
      if (p.v < 0.2) this.flags.stopT += DT
      else this.flags.stopT = 0
      if (this.flags.stopT > 0.8) {
        if (p.z < -0.4 && p.z > -2.6) this.log('positioning', 'good', 'Du stanset godt plassert inntil høyre kant.')
        else this.log('positioning', 'minor', 'Du stanset for langt ut i vegen.', undefined, 'stopPos')
        return this.finish('stopped')
      }
      if (p.x < -70) {
        this.log('trafficRules', 'minor', 'Du stanset ikke der instruktøren ba om det.')
        return this.finish('wrong-way')
      }
    }
    if (this.t > 120) return this.finish('timeout')
  }

  private updateCar(p: VehicleState) {
    const c = this.car
    if (!c.active) return
    // simple driver: keeps 7 m/s, brakes hard if the player blocks its lane ahead
    const ahead = c.x - p.x // car drives −x
    const inLane = Math.abs(p.z - c.z) < 1.9
    const blocking = inLane && ahead > 0 && ahead < 16 && p.x < 8
    if (blocking) {
      c.v = Math.max(0, c.v - 7 * DT)
      if (!this.flags.carBraked && c.v < 5.5) {
        this.flags.carBraked = true
        this.log('trafficRules', 'major', 'Bilen fra høyre måtte bremse for deg.', undefined, 'yield')
      }
    } else c.v = Math.min(c.vTarget, c.v + 2.5 * DT)
    c.x -= c.v * DT
    if (c.x < -150) c.active = false
    if (this.seg !== 'approach' && !this.flags.carBraked && c.x < -R && !this.said.has('ev:yield-ok') && p.x > c.x + 3) this.log('trafficRules', 'good', 'Du viket for bilen fra høyre før du svingte.', 'yield-ok')
    if (gapBetween(p, CAR_LEN, CAR_WID, c, CAR_LEN, CAR_WID) < 0.02) {
      this.log('trafficRules', 'critical', 'Du kolliderte med bilen fra høyre.', undefined, 'collision')
      this.finish('collision')
    }
  }

  private updateWalker(p: VehicleState) {
    const w = this.walker
    if (!w.active) return
    const inRoad = Math.abs(w.z) < R + 0.2
    const d = Math.hypot(p.x - w.x, p.z - w.z)
    // pedestrian stops if a car is about to hit them (and remembers it)
    const threatened = d < 4 && p.v > 0.5 && inRoad
    if (threatened) w.stoppedFor = true
    w.v = threatened ? 0 : w.vTarget
    w.z -= w.v * DT
    if (w.z < -30) w.active = false
    // conflict: the player passes the walker's line while the walker is in the road
    if (inRoad && Math.abs(p.x - w.x) < 1.6 && p.v > 0.8 && !this.flags.walkerConflict) {
      this.flags.walkerConflict = true
      this.log('trafficRules', 'major', 'Du kjørte forbi fotgjengeren som var i vegen du svingte inn i.', undefined, 'walker')
    }
    if (d < 1.1) {
      this.log('trafficRules', 'critical', 'Du var i ferd med å kjøre på fotgjengeren.', undefined, 'collision')
      this.finish('collision')
    }
    if (!inRoad && w.z < -R - 0.5 && !this.flags.walkerConflict && this.seg !== 'approach' && !this.said.has('ev:walker-ok') && p.x < -R) this.log('trafficRules', 'good', 'Du lot fotgjengeren gå over før du kjørte videre.', 'walker-ok')
  }

  private finish(reason: Assessment['reason']) {
    this.seg = 'done'
    this.finished = { ...assess(this.events, this.flags, reason, this.t, this.mode), observations: [...this.observations] }
    this.instruction = null
  }
}

/* ───────────── scoring ───────────── */

const PENALTY: Record<DriveEvent['kind'], number> = { good: 0, minor: 0.15, major: 0.35, critical: 1 }

export type Verdict = 'god' | 'ova' | 'alvorlig'
export const VERDICT_LABELS: Record<Verdict, string> = { god: 'God kjøring', ova: 'Noe å øve på', alvorlig: 'Alvorlig feil' }
export function verdictOf(a: Assessment): Verdict {
  if (a.events.some((e) => e.kind === 'critical' || (e.kind === 'major' && e.area === 'trafficRules'))) return 'alvorlig'
  return a.total >= 0.85 && !a.events.some((e) => e.kind === 'major') ? 'god' : 'ova'
}

export function assess(drive: DriveEvent[], flags: DriveFlags, reason: Assessment['reason'], duration: number, mode: ControlMode): Assessment {
  const events = [...drive]
  const areas: Record<Area, number> = { observation: 1, speedAdaptation: 1, positioning: 1, trafficRules: 1 }
  for (const e of events) areas[e.area] -= PENALTY[e.kind]
  // observation is earned, not assumed: no head check before an unmarked junction = clear fault
  if (!flags.lookedRight) {
    areas.observation -= 0.5
    events.push({ t: Math.round(duration * 10) / 10, area: 'observation', kind: 'major', text: 'Du så ikke til høyre før det uoversiktlige krysset.', x: 0, z: 0, ...COACH.lookRight })
  }
  if (!flags.lookedLeft) {
    areas.observation -= 0.2
    events.push({ t: Math.round(duration * 10) / 10, area: 'observation', kind: 'minor', text: 'Du så ikke til venstre før du svingte.', x: 0, z: 0, ...COACH.lookLeft })
  }
  const lane = flags.laneN ? flags.laneErr / flags.laneN : 0
  if (lane > 0.6) {
    areas.positioning -= 0.2
    events.push({ t: Math.round(duration * 10) / 10, area: 'positioning', kind: 'minor', text: `Ujevn plassering i kjørefeltet (i snitt ${lane.toFixed(1)} m fra midten av feltet).`, x: 0, z: 0, ...COACH.lane })
  }
  if (reason !== 'stopped') for (const k of Object.keys(areas) as Area[]) areas[k] = Math.min(areas[k], reason === 'collision' ? 0.2 : 0.6)
  for (const k of Object.keys(areas) as Area[]) areas[k] = Math.round(Math.max(0, Math.min(1, areas[k])) * 100) / 100
  let total = (areas.observation + areas.speedAdaptation + areas.positioning + areas.trafficRules) / 4
  // a serious traffic-rule fault (someone had to brake / evade for you) decides the verdict on its own
  if (events.some((e) => e.area === 'trafficRules' && (e.kind === 'major' || e.kind === 'critical'))) total = Math.min(total, 0.55)
  total = Math.round(total * 100) / 100
  return { areas, total, events: events.sort((a, b) => a.t - b.t), completed: reason === 'stopped', reason, duration: Math.round(duration), mode }
}
