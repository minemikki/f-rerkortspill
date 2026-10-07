import { line } from '../engine/path'
import type { ScenarioDef } from '../engine/types'
import { RETT } from './layouts'

/**
 * Nivå 2 — Ballen
 * Straight residential street, a van parked on the right. A ball rolls out
 * from in front of the van; a child follows. REACTION mechanic: the brake
 * button is live the whole drive — braking after the ball (before the child)
 * gives PERFECT AWARENESS.
 */

const V = 8.3 // 30 km/h
const Z0 = 42
const playerPath = line(RETT.playerX, Z0, RETT.playerX, -90)
const sP = (z: number) => Z0 - z

const T_BALL = 2.3
const T_CHILD = 3.5
const CZ = RETT.crossZ

// ball rolls west across the street from the gap in front of the van
const ballPath = line(3.9, CZ + 0.15, -7.5, CZ - 0.6)
// child: from the gap by the kerb, across to the left pavement
const childPath = line(4.3, CZ, -5.4, CZ - 0.4)

const STOP_SOFT = sP(0.9) // front ≈ 2.9 m before the child's line
const STOP_FIRM = sP(-0.1)
const STOP_EMERGENCY = sP(-0.95)

const RESUME = 7.6 // absolute: child is safely on the far pavement

export const s2: ScenarioDef = {
  id: 's2-ballen',
  environment: 'boliggate-rett',
  mood: 'day',
  difficulty: 2,
  mechanics: ['reaction'],
  completionXp: 25,
  camera: { kind: 'chase', back: 9, up: 4.2, ahead: 10 },
  actors: [
    { id: 'player', kind: 'car', path: playerPath, v0: V, program: [{ at: 0, v: V }], color: '#E8E4DA' },
    { id: 'van', kind: 'van', path: line(RETT.vanX, RETT.vanZ + 3, RETT.vanX, RETT.vanZ - 3), s0: 3, parked: true, color: '#F2F0EA' },
    { id: 'parked-a', kind: 'car', path: line(RETT.vanX + 0.1, -6, RETT.vanX + 0.1, -12), s0: 3, parked: true, color: '#3C4A57' },
    { id: 'parked-b', kind: 'car', path: line(RETT.vanX + 0.1, 12, RETT.vanX + 0.1, 6), s0: 3, parked: true, color: '#7A2A26' },
    { id: 'parked-c', kind: 'car', path: line(-RETT.vanX - 0.1, -22, -RETT.vanX - 0.1, -16), s0: 3, parked: true, color: '#B9B3A6' },
    {
      id: 'ball',
      kind: 'ball',
      path: ballPath,
      visible: false,
      program: [{ at: T_BALL, setV: 4.6, v: 0, decel: 0.55 }],
    },
    {
      id: 'child',
      kind: 'child',
      path: childPath,
      visible: false,
      program: [{ at: T_CHILD, setV: 1.5, v: 3.1, accel: 5 }],
      variant: 1,
    },
    {
      id: 'neighbour',
      kind: 'pedestrian',
      path: line(-5.2, -30, -5.2, 40),
      s0: 18,
      v0: 1.2,
      program: [{ at: 0, v: 1.2 }],
      variant: 3,
    },
  ],
  cues: [
    { at: T_BALL, type: 'visible', actor: 'ball', visible: true },
    { at: T_BALL + 0.05, type: 'sound', sound: 'ballBounce', actor: 'ball' },
    { at: T_BALL + 0.7, type: 'sound', sound: 'ballBounce', actor: 'ball' },
    { at: T_CHILD - 0.25, type: 'visible', actor: 'child', visible: true },
    { at: T_CHILD, type: 'pose', actor: 'child', pose: 'run' },
  ],
  steps: [
    {
      id: 'react',
      kind: 'reaction',
      trigger: { time: 0.05 },
      tests: ['risk', 'reaction'],
      windows: [
        { until: T_BALL - 0.9, outcome: 'cautious' },
        { until: T_CHILD + 0.05, outcome: 'perfect' },
        { until: T_CHILD + 0.95, outcome: 'late' },
      ],
      failAt: T_CHILD + 0.95,
      outcomes: {
        cautious: {
          id: 'cautious',
          result: 'good',
          scores: { risk: 0.9, reaction: 1 },
          xp: 70,
          duration: 6,
          feedbackAt: 3.2,
          commands: {
            player: [
              { at: 0, v: 4.5, decel: 2 },
              { at: 1.6, stopAt: STOP_SOFT, decel: 1.8 },
              { at: RESUME, abs: true, v: V, accel: 1.8 },
            ],
          },
        },
        perfect: {
          id: 'perfect',
          result: 'perfect',
          scores: { risk: 1, reaction: 1 },
          xp: 100,
          badge: 'perfect-awareness',
          duration: 6,
          feedbackAt: 1.9,
          commands: {
            player: [
              { at: 0, stopAt: STOP_SOFT, decel: 2.2 },
              { at: RESUME, abs: true, v: V, accel: 1.8 },
            ],
          },
          highlight: ['ball', 'child'],
        },
        late: {
          id: 'late',
          result: 'good',
          scores: { risk: 0.45, reaction: 0.75 },
          xp: 40,
          duration: 6,
          feedbackAt: 1.4,
          commands: {
            player: [
              { at: 0, stopAt: STOP_FIRM, decel: 5 },
              { at: RESUME + 0.4, abs: true, v: V, accel: 1.8 },
            ],
          },
          highlight: ['ball'],
        },
        fail: {
          id: 'fail',
          result: 'wrong',
          scores: { risk: 0, reaction: 0.1 },
          xp: 5,
          duration: 5,
          freezeAt: 1.25,
          highlight: ['ball', 'child'],
          commands: {
            player: [
              { at: 0.05, stopAt: STOP_EMERGENCY, decel: 7 },
              { at: 3.6, v: V, accel: 1.8 },
            ],
            child: [
              { at: 0.05, v: 0, decel: 9 },
              { at: 1.9, v: 3.1, accel: 4 },
            ],
          },
          cues: [
            { at: 0.05, type: 'pose', actor: 'child', pose: 'recoil' },
            { at: 1.9, type: 'pose', actor: 'child', pose: 'run' },
          ],
        },
      },
    },
  ],
  end: { playerS: sP(-34) },
}
