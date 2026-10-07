import { PathBuilder, line } from '../engine/path'
import type { ScenarioDef } from '../engine/types'
import { BYGATE } from './layouts'

/**
 * Nivå 3 — Se syklisten
 * City street with a bike lane. Player turns right into a side street.
 * A cyclist comes from behind in the bike lane, going straight on.
 * SPOT mechanic: tap what you must watch out for. Missing the cyclist →
 * right-hook near-miss.
 */

const Z0 = 40
const R = BYGATE.turnR
const PX = BYGATE.playerX
const zTurn = BYGATE.sideHalf / 2 + R // turn starts here, ends in lane z = +2

const playerPath = new PathBuilder(PX, Z0, Math.PI).forwardTo('z', zTurn).right(R, 90).forward(70).build()
const sP = (z: number) => Z0 - z // valid before the turn
const S_TURN = Z0 - zTurn

const CYC_Z0 = 52
const cyclistPath = line(BYGATE.bikeX, CYC_Z0, BYGATE.bikeX, -90)
const sC = (z: number) => CYC_Z0 - z

export const s3: ScenarioDef = {
  id: 's3-syklisten',
  environment: 'bygate-sving',
  mood: 'overcast',
  difficulty: 2,
  mechanics: ['spot', 'scan'],
  completionXp: 30,
  camera: { kind: 'chase', back: 9, up: 4.4, ahead: 9 },
  actors: [
    {
      id: 'player',
      kind: 'car',
      path: playerPath,
      v0: 7,
      color: '#E8E4DA',
      indicator: 'right',
      program: [
        { at: 0, v: 7 },
        { at: 1.6, v: 3.4, decel: 1.9 },
        { at: 8.2, v: 7.5, accel: 1.6 },
      ],
    },
    {
      id: 'cyclist',
      kind: 'cyclist',
      path: cyclistPath,
      v0: 5.6,
      program: [{ at: 0, v: 5.6 }],
      variant: 0,
    },
    // distractors / life
    {
      id: 'ped-far',
      kind: 'pedestrian',
      path: line(7.1, 12, 7.1, 80),
      s0: 4,
      v0: 1.25,
      program: [{ at: 0, v: 1.25 }],
      variant: 2,
    },
    {
      id: 'bus',
      kind: 'bus',
      path: line(-PX, -80, -PX, 90),
      s0: 52,
      v0: 6,
      program: [{ at: 0, v: 6 }],
      color: '#C8102E',
    },
    {
      id: 'ped-bus',
      kind: 'pedestrian',
      path: line(-7.4, -10, -7.4, 10),
      s0: 11,
      v0: 0,
      variant: 4,
    },
  ],
  cues: [{ at: 0, type: 'pose', actor: 'ped-bus', pose: 'phone' }],
  steps: [
    {
      id: 'spot',
      kind: 'spot',
      focus: ['cyclist'],
      trigger: { playerS: sP(14.5) },
      tests: ['observation', 'risk'],
      timeLimit: 8,
      targets: ['cyclist'],
      distractors: ['ped-far', 'bus', 'ped-bus'],
      camera: { kind: 'chase', back: 17, up: 10.5, ahead: -5, side: 2.2, fov: 54 },
      outcomes: {
        all: {
          id: 'all',
          result: 'perfect',
          scores: { observation: 1, risk: 1 },
          xp: 90,
          badge: 'sharp-eyes',
          duration: 6,
          feedbackAt: 2.4,
          highlight: ['cyclist'],
          commands: {
            player: [
              { at: 0, stopAt: S_TURN - 1.6, decel: 2.2 },
              { at: 9.0, abs: true, v: 3.4, accel: 1.6 },
              { at: 11.2, abs: true, v: 7.5, accel: 1.6 },
            ],
          },
        },
        none: {
          id: 'none',
          result: 'wrong',
          scores: { observation: 0, risk: 0 },
          xp: 5,
          duration: 6,
          freezeAt: 3.35,
          highlight: ['cyclist'],
          commands: {
            player: [
              { at: 0, v: 3.4 },
              { at: 2.8, stopAt: S_TURN + 4.4, decel: 6 },
              { at: 4.6, v: 5, accel: 1.6 },
            ],
            cyclist: [
              { at: 2.55, stopAt: sC(5.35), decel: 5 },
              { at: 6.4, v: 5, accel: 1.2 },
            ],
          },
          cues: [{ at: 2.8, type: 'sound', sound: 'bell', actor: 'cyclist' }],
        },
      },
    },
  ],
  end: { playerS: S_TURN + 30 },
}
