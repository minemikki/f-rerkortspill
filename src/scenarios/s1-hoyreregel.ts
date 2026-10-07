import { line } from '../engine/path'
import type { ScenarioDef } from '../engine/types'
import { KRYSS } from './layouts'

/**
 * Nivå 1 — Hvem kjører først?
 * Player drives north through an unmarked residential intersection.
 * A car approaches from the right (east) and arrives at the same time.
 */

const L = KRYSS.lane
const V = 7 // ≈ 25 km/h

// player: x = +1.5, from z = 45 northwards. s = 45 − z
const playerPath = line(L, 45, L, -80)
// car from the right: heading west on z = −1.5. s = 48 − x
const rightPath = line(48, -L, -80, -L)

const sPlayer = (z: number) => 45 - z
const sRight = (x: number) => 48 - x

export const s1: ScenarioDef = {
  id: 's1-hoyreregel',
  environment: 'boliggate-kryss',
  mood: 'morning',
  difficulty: 1,
  mechanics: ['priority', 'choice'],
  completionXp: 25,
  // low, close chase cam (driver's-eye feel); the decision step cranes up to show the side road
  camera: { kind: 'chase', back: 7.4, up: 3.1, ahead: 11, fov: 52 },
  actors: [
    { id: 'player', kind: 'car', path: playerPath, v0: V, program: [{ at: 0, v: V }], color: '#E8E4DA' },
    { id: 'car-right', kind: 'car', path: rightPath, v0: V, program: [{ at: 0, v: V }], color: '#2F5D8A' },
    // ambience
    {
      id: 'walker',
      kind: 'pedestrian',
      path: line(-4.6, -40, -4.6, 30),
      s0: 22,
      v0: 1.3,
      program: [{ at: 0, v: 1.3 }],
      variant: 2,
    },
    // parked at the left kerb, facing the direction of travel on that side
    { id: 'parked-1', kind: 'car', path: line(-2.05, 26, -2.05, 42), parked: true, color: '#8C2F2A' },
  ],
  steps: [
    {
      id: 'priority',
      kind: 'choice',
      focus: ['car-right'],
      trigger: { playerS: sPlayer(14.5) },
      tests: ['rules', 'risk'],
      timeLimit: 7,
      timeoutOption: 'go',
      camera: { kind: 'chase', back: 11, up: 7.2, ahead: 8, side: 0.4, fov: 54 },
      options: [
        {
          id: 'wait',
          outcome: {
            id: 'wait',
            result: 'perfect',
            scores: { rules: 1, risk: 1 },
            xp: 60,
            badge: 'rule-master',
            duration: 6,
            feedbackAt: 1.9,
            commands: {
              player: [
                { at: 0, stopAt: sPlayer(5.8), decel: 2.6 },
                { at: 3.25, v: V, accel: 2 },
              ],
            },
            highlight: ['car-right'],
          },
        },
        {
          id: 'go',
          outcome: {
            id: 'go',
            result: 'wrong',
            scores: { rules: 0, risk: 0.2 },
            xp: 5,
            duration: 5,
            freezeAt: 2.1,
            highlight: ['car-right'],
            commands: {
              'car-right': [
                { at: 1.15, stopAt: sRight(5.4), decel: 6 },
                { at: 3.85, v: V, accel: 1.6 },
              ],
            },
            cues: [{ at: 1.55, type: 'sound', sound: 'horn', actor: 'car-right' }],
          },
        },
        {
          id: 'speed',
          outcome: {
            id: 'speed',
            result: 'wrong',
            scores: { rules: 0, risk: 0 },
            xp: 0,
            duration: 5,
            freezeAt: 1.78,
            highlight: ['car-right'],
            commands: {
              player: [{ at: 0, v: 10.5, accel: 3 }],
              'car-right': [
                { at: 0.9, stopAt: sRight(5.3), decel: 7 },
                { at: 3.5, v: V, accel: 1.6 },
              ],
            },
            cues: [{ at: 1.1, type: 'sound', sound: 'horn', actor: 'car-right' }],
          },
        },
      ],
    },
  ],
  end: { playerS: sPlayer(-26) },
}
