import type { ScenarioDef } from '../engine/types'

export interface Mood {
  sunPos: [number, number, number]
  sunColor: string
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  skyTop: string
  skyHorizon: string
  fog: string
  fogNear: number
  fogFar: number
  exposure: number
}

export const MOODS: Record<ScenarioDef['mood'], Mood> = {
  morning: {
    sunPos: [70, 42, 34],
    sunColor: '#ffe0bd',
    sunIntensity: 2.5,
    hemiSky: '#bfd3e8',
    hemiGround: '#6b6150',
    hemiIntensity: 1.05,
    skyTop: '#5d92cf',
    skyHorizon: '#f1dcc4',
    fog: '#e6dccd',
    fogNear: 60,
    fogFar: 260,
    exposure: 1.0,
  },
  day: {
    sunPos: [40, 80, 46],
    sunColor: '#fff6e6',
    sunIntensity: 2.6,
    hemiSky: '#c6dbef',
    hemiGround: '#6f6a58',
    hemiIntensity: 1.1,
    skyTop: '#6e9fd2',
    skyHorizon: '#dfe9ef',
    fog: '#dbe5ea',
    fogNear: 70,
    fogFar: 280,
    exposure: 1.0,
  },
  overcast: {
    sunPos: [26, 70, 30],
    sunColor: '#eef2f4',
    sunIntensity: 1.35,
    hemiSky: '#dbe2e7',
    hemiGround: '#77736a',
    hemiIntensity: 1.6,
    skyTop: '#93a7b8',
    skyHorizon: '#dfe3e5',
    fog: '#d3d9dc',
    fogNear: 45,
    fogFar: 220,
    exposure: 1.02,
  },
  golden: {
    sunPos: [-72, 30, -12],
    sunColor: '#ffbd80',
    sunIntensity: 2.9,
    hemiSky: '#b8c7dc',
    hemiGround: '#6e5a45',
    hemiIntensity: 0.95,
    skyTop: '#6787b2',
    skyHorizon: '#f6c592',
    fog: '#ecc49d',
    fogNear: 60,
    fogFar: 250,
    exposure: 1.0,
  },
}
