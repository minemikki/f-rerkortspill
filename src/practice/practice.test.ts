import { describe, expect, it } from 'vitest'
import { runDrive } from './autopilot'
import { DT, PracticeSession, stepVehicle, verdictOf } from './session'

describe('practice vehicle', () => {
  it('is predictable: straight line, no drift, stops under braking', () => {
    let s = { x: 0, z: 0, h: 0, v: 0, a: 0, steer: 0 }
    for (let i = 0; i < 300; i++) s = stepVehicle(s, { throttle: 1, brake: 0, steer: 0 }, DT)
    expect(s.x).toBeCloseTo(0, 6)
    expect(s.v).toBeGreaterThan(6)
    expect(s.v).toBeLessThan(16)
    for (let i = 0; i < 300; i++) s = stepVehicle(s, { throttle: 0, brake: 1, steer: 0 }, DT)
    expect(s.v).toBe(0)
  })
  it('turns left for positive steer', () => {
    let s = { x: 0, z: 0, h: Math.PI, v: 5, a: 0, steer: 0 }
    for (let i = 0; i < 60; i++) s = stepVehicle(s, { throttle: 0.3, brake: 0, steer: 1 }, DT)
    expect(s.x).toBeLessThan(-0.5) // heading −z, left is −x
  })
})

describe('practice drive + KJØREVURDERING', () => {
  it('a careful driver completes the route with a high assessment', () => {
    const s = new PracticeSession('practice')
    const a = runDrive(s, 'careful')!
    expect(a.reason, JSON.stringify(a.events.filter((e) => e.kind !== 'good'))).toBe('stopped')
    expect(a.events.filter((e) => e.kind === 'major' || e.kind === 'critical')).toEqual([])
    expect(a.total).toBeGreaterThanOrEqual(0.85)
    expect(a.events.some((e) => e.kind === 'good' && e.area === 'trafficRules')).toBe(true)
    expect(verdictOf(a)).toBe('god')
  })

  it('a careless driver is caught: speed into the junction, no head check, yield violations', () => {
    const s = new PracticeSession('practice')
    const a = runDrive(s, 'careless')!
    const texts = a.events.map((e) => e.text).join('\n')
    expect(texts).toMatch(/inn mot krysset i \d+ km\/t/)
    expect(texts).toMatch(/så ikke til høyre/)
    expect(a.events.some((e) => e.area === 'trafficRules' && (e.kind === 'major' || e.kind === 'critical'))).toBe(true)
    expect(a.total).toBeLessThan(0.6)
    expect(verdictOf(a)).toBe('alvorlig')
  })

  it('is deterministic', () => {
    const a = runDrive(new PracticeSession('practice'), 'careful')
    const b = runDrive(new PracticeSession('practice'), 'careful')
    expect(a).toEqual(b)
  })

  it('exam mode gives route instructions but never coaching', () => {
    const s = new PracticeSession('exam')
    const seen: string[] = []
    for (let i = 0; i < 120 / DT && !s.finished; i++) {
      s.setControls({ throttle: 0.4, brake: 0, steer: 0 })
      s.step()
      if (s.instruction && !seen.includes(s.instruction.id)) seen.push(s.instruction.id)
    }
    expect(seen).toContain('turn')
    expect(seen.filter((x) => x.startsWith('coach'))).toEqual([])
  })
})
