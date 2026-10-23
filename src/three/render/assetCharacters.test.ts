import { describe, expect, it } from 'vitest'
import { characterAssetFor, chooseClip } from './assetCharacters'

const A = { walkSpeed: 1.4, runSpeed: 3.6 }
describe('authored character clip choice', () => {
  it('idle when standing, walk at walking pace, run above the midpoint or when posed to run', () => {
    expect(chooseClip({ v: 0, pose: 'auto' }, A).clip).toBe('idle')
    expect(chooseClip({ v: 1.3, pose: 'auto' }, A).clip).toBe('walk')
    expect(chooseClip({ v: 3.2, pose: 'auto' }, A).clip).toBe('run')
    expect(chooseClip({ v: 0, pose: 'run' }, A).clip).toBe('run')
  })
  it('playback rate follows speed so feet do not slide, clamped', () => {
    expect(chooseClip({ v: 1.4, pose: 'auto' }, A).rate).toBeCloseTo(1)
    expect(chooseClip({ v: 0.3, pose: 'auto' }, A).rate).toBe(0.5)
  })
  it('no assets registered in production → procedural figures', () => {
    expect(characterAssetFor('adult', 0)).toBeNull()
    expect(characterAssetFor('child', 2)).toBeNull()
  })
})
