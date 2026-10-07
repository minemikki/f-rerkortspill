import { line } from '../engine/path'
import type { ScenarioDef } from '../engine/types'
import { GANGFELT } from './layouts'

/**
 * Nivå 4 — Fotgjengeren
 * Approaching a zebra crossing. A woman stands back from the kerb with her
 * phone, then looks at the traffic and turns towards the crossing.
 * A car follows close behind the player — braking abruptly is not free.
 */

const V = 8.3
const Z0 = 50
const X = GANGFELT.laneX
const playerPath = line(X, Z0, X, -90)
const sP = (z: number) => Z0 - z
const STOP_LINE = sP(GANGFELT.crossHalf + 0.8 + 2.2) // front ≈ 0.8 m before the stripes

// pedestrian crosses east → west along z = 0
const PED_X0 = 5.4
const pedPath = line(PED_X0, 0.2, -7, 0.2)
const sPed = (x: number) => PED_X0 - x

const STEP_OUT = 1.45 // relative to decision

export const s4: ScenarioDef = {
  id: 's4-gangfelt',
  environment: 'gangfelt',
  mood: 'golden',
  difficulty: 3,
  mechanics: ['speed', 'choice'],
  completionXp: 30,
  camera: { kind: 'chase', back: 10.5, up: 6.6, ahead: 11 },
  actors: [
    { id: 'player', kind: 'car', path: playerPath, v0: V, program: [{ at: 0, v: V }], color: '#E8E4DA' },
    {
      id: 'follower',
      kind: 'car',
      path: playerPath,
      s0: -12.6,
      v0: V,
      program: [{ at: 0, v: 12 }],
      follow: { leader: 'player', gap: 2.2, headway: 0.55 },
      color: '#4B5A3C',
    },
    {
      id: 'oncoming',
      kind: 'car',
      path: line(-X, -60, -X, 90),
      s0: 22,
      v0: 8,
      program: [{ at: 0, v: 8 }],
      color: '#9AA3AD',
    },
    {
      id: 'ped',
      kind: 'pedestrian',
      path: pedPath,
      s0: -0.2,
      v0: 0,
      variant: 0,
    },
    {
      id: 'jogger',
      kind: 'pedestrian',
      path: line(-5.0, -40, -5.0, 60),
      s0: 30,
      v0: 2.4,
      program: [{ at: 0, v: 2.4 }],
      variant: 5,
    },
  ],
  cues: [
    { at: 0, type: 'pose', actor: 'ped', pose: 'phone' },
    { at: 0, type: 'face', actor: 'ped', heading: Math.PI * 0.85 },
    { at: 2.0, type: 'pose', actor: 'ped', pose: 'look' },
    { at: 2.0, type: 'face', actor: 'ped', heading: 0.25 },
  ],
  steps: [
    {
      id: 'approach',
      kind: 'choice',
      focus: ['ped'],
      trigger: { playerS: sP(25) },
      tests: ['risk', 'rules', 'observation'],
      timeLimit: 7,
      timeoutOption: 'hold',
      camera: { kind: 'chase', back: 10, up: 6.8, ahead: 13, side: 0.8 },
      setup: {
        commands: { ped: [{ at: 0, stopAt: 0.25, v: 0.6 }] },
        cues: [{ at: 0, type: 'face', actor: 'ped', heading: -Math.PI / 2 + 0.5 }],
      },
      options: [
        {
          id: 'slow',
          outcome: {
            id: 'slow',
            result: 'perfect',
            scores: { risk: 1, rules: 1, observation: 1 },
            xp: 90,
            badge: 'smooth-operator',
            duration: 9,
            feedbackAt: 4.1,
            highlight: ['ped'],
            commands: {
              player: [
                { at: 0, v: 4.2, decel: 2.2 },
                { at: 1.6, stopAt: STOP_LINE, decel: 2.0 },
                { at: 7.4, v: V, accel: 1.8 },
              ],
              ped: [
                { at: STEP_OUT, v: 1.45, accel: 2 },
              ],
            },
            cues: [
              { at: STEP_OUT, type: 'face', actor: 'ped', heading: null },
              { at: STEP_OUT, type: 'pose', actor: 'ped', pose: 'auto' },
              { at: STEP_OUT + 2.5, type: 'pose', actor: 'ped', pose: 'wave' },
              { at: STEP_OUT + 3.6, type: 'pose', actor: 'ped', pose: 'auto' },
            ],
          },
        },
        {
          id: 'hold',
          outcome: {
            id: 'hold',
            result: 'wrong',
            scores: { risk: 0, rules: 0, observation: 0.3 },
            xp: 5,
            duration: 8,
            freezeAt: 2.7,
            highlight: ['ped'],
            commands: {
              player: [
                { at: 1.6, stopAt: STOP_LINE + 1.2, decel: 7 },
                { at: 7.6, v: V, accel: 1.8 },
              ],
              ped: [
                { at: 1.15, v: 1.45, accel: 2 },
                { at: 1.6, stopAt: sPed(3.95), decel: 6 },
                { at: 3.9, v: 1.45, accel: 2 },
              ],
            },
            cues: [
              { at: 1.15, type: 'face', actor: 'ped', heading: null },
              { at: 1.15, type: 'pose', actor: 'ped', pose: 'auto' },
              { at: 1.7, type: 'pose', actor: 'ped', pose: 'recoil' },
              { at: 3.9, type: 'pose', actor: 'ped', pose: 'auto' },
            ],
          },
        },
        {
          id: 'brake',
          outcome: {
            id: 'brake',
            result: 'partial',
            scores: { risk: 0.45, rules: 1, observation: 0.8 },
            xp: 35,
            duration: 9,
            feedbackAt: 1.6,
            highlight: ['follower'],
            commands: {
              player: [
                { at: 0, v: 0, decel: 7.5 },
                { at: 1.8, stopAt: STOP_LINE, v: 3, decel: 2 },
                { at: 7.6, v: V, accel: 1.8 },
              ],
              ped: [{ at: STEP_OUT, v: 1.45, accel: 2 }],
            },
            cues: [
              { at: 0.9, type: 'sound', sound: 'horn', actor: 'follower' },
              { at: STEP_OUT, type: 'face', actor: 'ped', heading: null },
              { at: STEP_OUT, type: 'pose', actor: 'ped', pose: 'auto' },
            ],
          },
        },
      ],
    },
  ],
  end: { playerS: sP(-30) },
}
