/**
 * Tuning harness: `TUNE=s1 npx vitest run src/engine/tune.test.ts` prints a
 * trace of every branch so choreography can be tuned numerically.
 */
import { test } from 'vitest'
import { playHeadless, type Policy } from './headless'
import { SCENARIOS } from '../scenarios'

const target = process.env.TUNE

test.skipIf(!target)('tune', () => {
  const def = SCENARIOS.find((s) => s.id.startsWith(target!))!
  const policies: Array<[string, Policy]> = JSON.parse(process.env.POLICIES ?? '[]')
  const trace = (process.env.TRACE ?? 'player').split(',')
  for (const [name, p] of policies) {
    const rep = playHeadless(def, p, { trace })
    console.log(`\n===== ${name} =====`)
    console.log(rep.log.join('\n'))
    console.log('outcomes', rep.outcomes)
    const close = Object.entries(rep.minGap)
      .filter(([, v]) => v.gap < 2.5)
      .map(([k, v]) => `${k}: ${v.gap.toFixed(2)}m @${v.t.toFixed(2)}`)
    console.log('closest', close)
    console.log('result', rep.result?.total, rep.result?.grade, 'xp', rep.result?.xp)
  }
})
