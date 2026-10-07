/**
 * Shared geometry for environments + choreography. Environments render these
 * numbers; scenarios drive actors along lanes derived from them.
 */
import type { RoundaboutGeom } from '../engine/path'

/** Residential 4-way intersection without signs (høyreregel). */
export const KRYSS = {
  roadHalf: 3, // 6 m wide roads, no markings
  lane: 1.5,
  verge: 1.6,
}

/** Straight residential street with parked cars. */
export const RETT = {
  roadHalf: 4,
  sidewalk: 2.2,
  playerX: 0.2,
  vanX: 2.9,
  vanZ: 0,
  crossZ: -4.0,
}

/** City street with bike lane and a side street to the right. */
export const BYGATE = {
  bike: 1.6,
  lane: 4,
  get roadHalf() {
    return this.lane + this.bike
  },
  sidewalk: 3,
  sideHalf: 4, // side street half-width (z ∈ [-4, 4])
  playerX: 2,
  bikeX: 4.8,
  turnR: 5,
}

/** Street with pedestrian crossing. */
export const GANGFELT = {
  roadHalf: 3.5,
  sidewalk: 2.8,
  laneX: 1.75,
  crossHalf: 1.5, // crossing z ∈ [-1.5, 1.5]
}

/** Single-lane roundabout. */
export const RUND: RoundaboutGeom & {
  islandR: number
  apronR: number
  outerR: number
  armHalf: number
  splitterHalf: number
  sidewalk: number
  crossNear: number
  crossFar: number
  yieldZ: number
  northCross: { near: number; far: number }
} = {
  laneOffset: 2.2,
  circleR: 9,
  entryR: 10,
  armLength: 80,
  islandR: 6.2,
  apronR: 7.1,
  outerR: 11.6,
  armHalf: 3.7,
  splitterHalf: 0.7,
  sidewalk: 2.6,
  crossNear: 18.5,
  crossFar: 21.5,
  yieldZ: 12.1,
  /** exit-side crossing on the north arm sits further out, behind the bus stop */
  northCross: { near: -27.5, far: -24.5 },
}
