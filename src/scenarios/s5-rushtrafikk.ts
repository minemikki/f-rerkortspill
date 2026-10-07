import { PathBuilder, line, roundaboutRoute } from '../engine/path'
import type { ScenarioDef } from '../engine/types'
import { RUND } from './layouts'

/**
 * Nivå 5 — BOSS: Rushtrafikk
 * Single-lane roundabout at rush hour. Four steps:
 *   1. SPOT   — find both hazards before entering (pedestrian + car in the roundabout)
 *   2. CHOICE — the car in the roundabout blinks right… but does it exit?
 *   3. LIGHTS — signal right before leaving
 *   4. REACTION — jogger crossing behind the bus at the exit
 */

const A = RUND.armLength
const playerPath = roundaboutRoute(RUND, 'S', 2, { startDist: A, endDist: 95 })
const z1 = Math.sqrt((RUND.entryR + RUND.circleR) ** 2 - (RUND.laneOffset + RUND.entryR) ** 2)
const alpha = Math.acos((RUND.laneOffset + RUND.entryR) / (RUND.entryR + RUND.circleR))
const sP = (z: number) => A - z // straight approach
const S_ARC1 = A - z1 // start of entry curve
const S_CIRCLE = S_ARC1 + RUND.entryR * alpha
const S_EXIT = S_CIRCLE + RUND.circleR * 2 * alpha
const S_OUT = S_EXIT + RUND.entryR * alpha
const sOut = (z: number) => S_OUT + (-z1 - z) // after exit, heading north

const NORTH_CROSS = RUND.northCross

const YIELD_S = sP(RUND.yieldZ + 2.5) // car front just behind the give-way line
const CROSS_S = sP(RUND.crossFar + 0.8 + 2.2)

// pedestrian at the south crossing: walks north on the east pavement, crosses west
const pedPath = PathBuilder.from(5.2, 44, 'N').forwardTo('z', (RUND.crossNear + RUND.crossFar) / 2 + 1.5).left(1.5, 90).forward(14).build()
const PED_CROSS_START = 44 - ((RUND.crossNear + RUND.crossFar) / 2 + 1.5) + 1.5 * (Math.PI / 2)

// jogger behind the bus at the north exit
const JZ = (NORTH_CROSS.near + NORTH_CROSS.far) / 2
const jogPath = PathBuilder.from(7.7, -31.6, 'S').forwardTo('z', JZ - 1.4).right(1.4, 90).forward(16).build()

const trapPath = roundaboutRoute(RUND, 'W', 2, { startDist: A, endDist: 95 })
const northPath = roundaboutRoute(RUND, 'N', 1, { startDist: A, endDist: 95 })
const circPath = roundaboutRoute(RUND, 'E', 2, { startDist: A, endDist: 95 })

// Absolute choreography times (the spot step is time-deterministic)
const T_RESUME_CROSS = 10.3
const T_TRAP_GO = 10.3
const T_CIRC_GO = 2.0

export const s5: ScenarioDef = {
  id: 's5-rushtrafikk',
  environment: 'rundkjoring',
  mood: 'golden',
  difficulty: 5,
  boss: true,
  mechanics: ['spot', 'choice', 'lights', 'reaction'],
  completionXp: 60,
  camera: { kind: 'chase', back: 10, up: 5, ahead: 10 },
  actors: [
    {
      id: 'player',
      kind: 'car',
      path: playerPath,
      v0: 9,
      color: '#E8E4DA',
      program: [
        { at: 0, v: 9 },
        { at: 3.0, v: 7, decel: 1.5 },
      ],
    },
    {
      id: 'follower',
      kind: 'car',
      path: playerPath,
      s0: -16,
      v0: 9,
      program: [{ at: 0, v: 9 }],
      follow: { leader: 'player', gap: 2.4 },
      color: '#2E3B4E',
    },
    {
      id: 'tail',
      kind: 'van',
      path: playerPath,
      s0: -32,
      v0: 9,
      program: [{ at: 0, v: 9 }],
      follow: { leader: 'follower', gap: 2.6 },
      color: '#D9D4C7',
    },
    {
      id: 'ped',
      kind: 'pedestrian',
      path: pedPath,
      s0: PED_CROSS_START - 7.0 * 1.4,
      v0: 1.4,
      program: [{ at: 0, v: 1.4 }],
      variant: 1,
    },
    {
      id: 'trap',
      kind: 'car',
      path: trapPath,
      s0: YIELD_S - 0.3,
      v0: 0,
      indicator: 'right',
      color: '#8E2B22',
      program: [
        { at: 0, stopAt: YIELD_S },
        { at: T_TRAP_GO, v: 6.2, accel: 1.8 },
      ],
    },
    {
      id: 'northcar',
      kind: 'car',
      path: northPath,
      s0: YIELD_S - 0.4,
      indicator: 'right',
      color: '#5D6B78',
      program: [{ at: 0, stopAt: YIELD_S }],
    },
    {
      id: 'north-q',
      kind: 'car',
      path: northPath,
      s0: YIELD_S - 7,
      color: '#C9B48A',
      program: [{ at: 0, v: 0 }],
      follow: { leader: 'northcar', gap: 2.2 },
    },
    {
      id: 'circ',
      kind: 'car',
      path: circPath,
      s0: YIELD_S - 0.2,
      color: '#E1E4E8',
      program: [
        { at: 0, stopAt: YIELD_S },
        { at: T_CIRC_GO, v: 7, accel: 2 },
      ],
    },
    {
      id: 'bus',
      kind: 'bus',
      path: line(5.9, -30, 5.9, -48),
      s0: 6,
      parked: true,
      color: '#C8102E',
      indicator: 'hazard',
    },
    {
      id: 'jogger',
      kind: 'pedestrian',
      path: jogPath,
      v0: 0,
      variant: 5,
    },
    {
      id: 'walker',
      kind: 'pedestrian',
      path: line(-5.4, 16, -5.4, 90),
      s0: 18,
      v0: 1.2,
      program: [{ at: 0, v: 1.2 }],
      variant: 3,
    },
    {
      id: 'cyc2',
      kind: 'cyclist',
      path: line(-9.6, 10, -9.6, 120),
      s0: 22,
      v0: 4.5,
      program: [{ at: 0, v: 4.5 }],
      variant: 1,
    },
  ],
  cues: [
    { at: 6.4, type: 'indicator', actor: 'circ', side: 'right' },
  ],
  steps: [
    {
      id: 'scan',
      kind: 'spot',
      focus: ['ped', 'circ'],
      trigger: { playerS: sP(41) },
      tests: ['observation'],
      timeLimit: 10,
      targets: ['ped', 'circ'],
      distractors: ['walker', 'cyc2'],
      camera: { kind: 'chase', back: 14, up: 9, ahead: 14, side: 0, fov: 54 },
      outcomes: {
        all: {
          id: 'all',
          result: 'perfect',
          scores: { observation: 1 },
          xp: 80,
          badge: 'sharp-eyes',
          duration: 3,
          feedbackAt: 0.6,
          commands: {
            player: [
              { at: 0, stopAt: CROSS_S, decel: 2.3 },
              { at: T_RESUME_CROSS, abs: true, stopAt: YIELD_S, v: 4, decel: 2.2 },
            ],
          },
        },
        missed: {
          circ: {
            id: 'missed-circ',
            result: 'partial',
            scores: { observation: 0.5 },
            xp: 30,
            duration: 3,
            feedbackAt: 0.6,
            highlight: ['circ'],
            commands: {
              player: [
                { at: 0, stopAt: CROSS_S, decel: 2.3 },
                { at: T_RESUME_CROSS, abs: true, stopAt: YIELD_S, v: 4, decel: 2.2 },
              ],
            },
          },
          ped: {
            id: 'missed-ped',
            result: 'wrong',
            scores: { observation: 0.4 },
            xp: 10,
            duration: 3,
            freezeAt: 2.2,
            highlight: ['ped'],
            commands: {
              player: [
                { at: 1.15, stopAt: CROSS_S + 0.9, decel: 7 },
                { at: T_RESUME_CROSS + 0.4, abs: true, stopAt: YIELD_S, v: 4, decel: 2.2 },
              ],
              ped: [
                { at: 1.5, stopAt: PED_CROSS_START + 0.25, decel: 6 },
                { at: 3.2, v: 1.6, accel: 2 },
              ],
            },
            cues: [
              { at: 1.6, type: 'pose', actor: 'ped', pose: 'recoil' },
              { at: 3.2, type: 'pose', actor: 'ped', pose: 'auto' },
            ],
          },
        },
        none: {
          id: 'none',
          result: 'wrong',
          scores: { observation: 0 },
          xp: 5,
          duration: 3,
          freezeAt: 2.2,
          highlight: ['ped', 'circ'],
          commands: {
            player: [
              { at: 1.15, stopAt: CROSS_S + 0.9, decel: 7 },
              { at: T_RESUME_CROSS + 0.4, abs: true, stopAt: YIELD_S, v: 4, decel: 2.2 },
            ],
            ped: [
              { at: 1.5, stopAt: PED_CROSS_START + 0.25, decel: 6 },
              { at: 3.2, v: 1.6, accel: 2 },
            ],
          },
          cues: [
            { at: 1.6, type: 'pose', actor: 'ped', pose: 'recoil' },
            { at: 3.2, type: 'pose', actor: 'ped', pose: 'auto' },
          ],
        },
      },
    },
    {
      id: 'blinker',
      kind: 'choice',
      focus: ['trap'],
      trigger: { playerS: YIELD_S - 0.35 },
      tests: ['rules', 'risk'],
      timeLimit: 7,
      timeoutOption: 'wait',
      camera: { kind: 'chase', back: 9, up: 6.5, ahead: 6, side: -3.2, fov: 56 },
      options: [
        {
          id: 'trust',
          outcome: {
            id: 'trust',
            result: 'wrong',
            scores: { rules: 0, risk: 0 },
            xp: 5,
            duration: 4,
            freezeAt: 1.55,
            highlight: ['trap'],
            commands: {
              player: [
                { at: 0, v: 3.2, accel: 2.4 },
                { at: 0.48, v: 0, decel: 7 },
                { at: 3.6, v: 6, accel: 1.8 },
              ],
              trap: [
                { at: 0.3, v: 0, decel: 7.5 },
                { at: 2.4, v: 6, accel: 1.8 },
              ],
            },
            cues: [{ at: 0.8, type: 'sound', sound: 'horn', actor: 'trap' }],
          },
        },
        {
          id: 'wait',
          outcome: {
            id: 'wait',
            result: 'perfect',
            scores: { rules: 1, risk: 1 },
            xp: 90,
            badge: 'rule-master',
            duration: 3.6,
            feedbackAt: 1.6,
            highlight: ['trap'],
            commands: { player: [{ at: 2.3, v: 6, accel: 2 }] },
          },
        },
        {
          id: 'rush',
          outcome: {
            id: 'rush',
            result: 'wrong',
            scores: { rules: 0, risk: 0 },
            xp: 0,
            duration: 4,
            freezeAt: 1.25,
            highlight: ['trap'],
            commands: {
              player: [
                { at: 0, v: 5, accel: 3.4 },
                { at: 0.34, v: 0, decel: 8 },
                { at: 3.6, v: 6, accel: 1.8 },
              ],
              trap: [
                { at: 0.2, v: 0, decel: 8 },
                { at: 2.4, v: 6, accel: 1.8 },
              ],
            },
            cues: [{ at: 0.6, type: 'sound', sound: 'horn', actor: 'trap' }],
          },
        },
      ],
    },
    {
      id: 'signal',
      kind: 'choice',
      trigger: { playerS: S_CIRCLE + RUND.circleR * alpha - 2.5 },
      tests: ['rules'],
      timeLimit: 7,
      timeoutOption: 'none',
      camera: { kind: 'chase', back: 8.5, up: 5.2, ahead: 9, side: 1.5, fov: 54 },
      options: [
        {
          id: 'right',
          outcome: {
            id: 'right',
            result: 'perfect',
            scores: { rules: 1 },
            xp: 50,
            duration: 2.5,
            feedbackAt: 0.9,
            highlight: ['northcar'],
            cues: [
              { at: 0, type: 'indicator', actor: 'player', side: 'right' },
              { at: 3.6, type: 'indicator', actor: 'player', side: null },
              { at: 1.0, type: 'indicator', actor: 'northcar', side: 'right' },
            ],
            commands: { northcar: [{ at: 1.1, v: 5.5, accel: 1.8 }] },
          },
        },
        {
          id: 'left',
          outcome: {
            id: 'left',
            result: 'wrong',
            scores: { rules: 0 },
            xp: 0,
            duration: 2.5,
            feedbackAt: 0.9,
            highlight: ['northcar'],
            cues: [
              { at: 0, type: 'indicator', actor: 'player', side: 'left' },
              { at: 3.6, type: 'indicator', actor: 'player', side: null },
            ],
            commands: { northcar: [{ at: 3.8, v: 5.5, accel: 1.8 }] },
          },
        },
        {
          id: 'none',
          outcome: {
            id: 'none',
            result: 'partial',
            scores: { rules: 0.2 },
            xp: 10,
            duration: 2.5,
            feedbackAt: 0.9,
            highlight: ['northcar'],
            commands: { northcar: [{ at: 3.8, v: 5.5, accel: 1.8 }] },
          },
        },
      ],
    },
    {
      id: 'exit',
      kind: 'reaction',
      trigger: { playerS: S_EXIT + 1.0 },
      tests: ['reaction', 'risk'],
      setup: {
        commands: {
          player: [{ at: 0, v: 7.2, accel: 1.6 }],
          jogger: [{ at: 0, setV: 1.6, v: 3.4, accel: 4 }],
        },
        cues: [{ at: 0, type: 'pose', actor: 'jogger', pose: 'run' }],
      },
      windows: [
        { until: 1.45, outcome: 'perfect' },
        { until: 1.8, outcome: 'late' },
      ],
      failAt: 1.8,
      outcomes: {
        perfect: {
          id: 'perfect',
          result: 'perfect',
          scores: { reaction: 1, risk: 1 },
          xp: 90,
          badge: 'early-reaction',
          duration: 7,
          feedbackAt: 1.5,
          highlight: ['jogger'],
          commands: {
            player: [
              { at: 0, stopAt: sOut(NORTH_CROSS.far + 0.9 + 2.2), decel: 2.6 },
              { at: 5.0, v: 8, accel: 1.8 },
            ],
          },
        },
        late: {
          id: 'late',
          result: 'good',
          scores: { reaction: 0.7, risk: 0.5 },
          xp: 45,
          duration: 7,
          feedbackAt: 1.0,
          highlight: ['jogger'],
          commands: {
            player: [
              { at: 0, stopAt: sOut(NORTH_CROSS.far + 0.3 + 2.2), decel: 5.5 },
              { at: 4.6, v: 8, accel: 1.8 },
            ],
          },
        },
        fail: {
          id: 'fail',
          result: 'wrong',
          scores: { reaction: 0.1, risk: 0 },
          xp: 5,
          duration: 6,
          freezeAt: 0.6,
          highlight: ['jogger'],
          commands: {
            player: [
              { at: 0, stopAt: sOut(NORTH_CROSS.far - 0.2 + 2.2), decel: 7 },
              { at: 3.8, v: 8, accel: 1.8 },
            ],
            jogger: [
              { at: 0.3, v: 0, decel: 9 },
              { at: 1.9, v: 3.3, accel: 4 },
            ],
          },
          cues: [
            { at: 0.3, type: 'pose', actor: 'jogger', pose: 'recoil' },
            { at: 1.9, type: 'pose', actor: 'jogger', pose: 'run' },
          ],
        },
      },
    },
  ],
  end: { playerS: sOut(-48) },
}

export const S5_DEBUG = { S_ARC1, S_CIRCLE, S_EXIT, S_OUT, YIELD_S, CROSS_S, PED_CROSS_START, z1 }
