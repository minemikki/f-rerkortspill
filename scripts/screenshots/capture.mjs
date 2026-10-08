// Captures the 18 required screenshots against `npm run dev` (needs playwright + a WebGL-capable chromium).
// usage: OUT=dir node scripts/screenshots/capture.mjs [job,job,...]   (jobs: see `jobs` below)
import { chromium } from 'playwright'
const out = process.env.OUT || '.'
const only = process.argv[2]?.split(',')
const BASE = 'http://localhost:5173/'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const DESK = { viewport: { width: 1440, height: 900 } }
const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const SEED = { xp: 340, streak: 3, lastPlayed: new Date().toISOString().slice(0, 10), results: { 's1-hoyreregel': { stars: 3, best: 100, grade: 'A', plays: 2 }, 's2-ballen': { stars: 2, best: 80, grade: 'B', plays: 1 } }, badges: [], sound: false }
async function page(ctxOpts, seed = true) {
  const ctx = await browser.newContext(ctxOpts)
  if (seed) await ctx.addInitScript((s) => { if (!localStorage.getItem('kjor-progress-v1')) localStorage.setItem('kjor-progress-v1', JSON.stringify({ state: s, version: 0 })) }, SEED)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('[pageerror]', e.message))
  return p
}
const click = async (p, t, last = false) => { for (let i = 0; i < 30; i++) { const ok = await p.evaluate(([t, last]) => { const bs = [...document.querySelectorAll('button')].filter((x) => x.textContent.includes(t) && !x.disabled); const b = last ? bs.pop() : bs[0]; if (!b) return false; b.click(); return true }, [t, last]); if (ok) return; await p.waitForTimeout(400) } throw new Error('no button ' + t) }
const adv = (p, ph) => p.evaluate((ph) => { let i = 0; while (window.__runner.ui.phase !== ph && i++ < 4000) window.__runner.update(0.05); return window.__runner.ui.phase }, ph)
const tick = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__runner.update(0.05) }, n)
const frames = (p, n) => p.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f) }), n)
const shot = async (p, name) => { await p.screenshot({ path: `${out}/${name}.png`, timeout: 180000 }); console.log('shot', name) }
async function scene(opts, id, wait = 11000) {
  const p = await page(opts)
  await p.goto(`${BASE}?quality=${opts === MOB ? 'medium' : 'high'}#/kjor/${id}`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__runner, null, { timeout: 60000 })
  await p.waitForTimeout(wait)
  await p.evaluate(() => { window.__camSnap = true })
  return p
}
const settle = async (p) => { await p.evaluate(() => { window.__camSnap = true }); await frames(p, 3); await p.waitForTimeout(1600) }

const jobs = {
  async 'landing-desktop'() { const p = await page(DESK); await p.goto(BASE + '?quality=high', { waitUntil: 'networkidle' }); await p.waitForTimeout(6000); await shot(p, '01-landing-desktop') },
  async 'landing-mobile'() { const p = await page(MOB); await p.goto(BASE + '?quality=medium', { waitUntil: 'networkidle' }); await p.waitForTimeout(6000); await shot(p, '02-landing-mobile') },
  async 'map-mobile'() { const p = await page(MOB); await p.goto(`${BASE}#/kart`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000); await p.evaluate(() => (document.querySelector('.no-scrollbar').scrollTop = 520)); await p.waitForTimeout(900); await shot(p, '03-map-mobile') },
  async 's1-drive'() { const p = await scene(DESK, 's1-hoyreregel'); await adv(p, 'drive'); await tick(p, 30); await settle(p); await shot(p, '04-s1-driving-desktop') },
  async 's1-decision'() { const p = await scene(DESK, 's1-hoyreregel'); await adv(p, 'step'); await tick(p, 10); await settle(p); await shot(p, '05-s1-decision-desktop') },
  async 's1-decision-mobile'() { const p = await scene(MOB, 's1-hoyreregel', 14000); await adv(p, 'step'); await tick(p, 10); await settle(p); await shot(p, '06-s1-decision-mobile') },
  async 's1-replay'() {
    const p = await scene(DESK, 's1-hoyreregel'); await adv(p, 'step'); await tick(p, 10)
    await p.evaluate(() => window.__runner.choose('go'))
    await adv(p, 'replay')
    await p.evaluate(() => { let i = 0; while (i++ < 2000) { const r = window.__runner.replayInfo; if (!r || (!r.pov && r.p > 0.7)) break; window.__runner.update(0.05) } })
    await settle(p); await shot(p, '07-s1-mistake-replay')
  },
  async 's1-success'() { const p = await scene(DESK, 's1-hoyreregel'); await adv(p, 'step'); await tick(p, 10); await p.evaluate(() => window.__runner.choose('wait')); await tick(p, 30); await settle(p); await shot(p, '08-s1-success') },
  async 's2'() {
    const p = await scene(DESK, 's2-ballen')
    // reaction steps arm during the drive: stop the moment the ball is out, before the child
    await p.evaluate(() => { let i = 0; const b = () => window.__runner.sim.byId.get('ball')?.view.visible; while (!b() && i++ < 4000) window.__runner.update(0.05) })
    await tick(p, Number(process.env.S2T ?? 12)); await settle(p); await shot(p, '09-s2-ball-hazard')
  },
  async 's3'() { const p = await scene(DESK, 's3-syklisten'); await adv(p, 'step'); await tick(p, 6); await settle(p); await shot(p, '10-s3-cyclist') },
  async 's4'() { const p = await scene(DESK, 's4-gangfelt'); await adv(p, 'step'); await tick(p, 6); await settle(p); await shot(p, '11-s4-pedestrian') },
  async 's5'() { const p = await scene(DESK, 's5-rushtrafikk'); await adv(p, 'step'); await tick(p, 6); await settle(p); await shot(p, '12-s5-boss') },
  async 'learn'() {
    const p = await scene(DESK, 's1-hoyreregel'); await adv(p, 'step'); await tick(p, 10); await p.evaluate(() => window.__runner.choose('wait'))
    await adv(p, 'complete'); await p.waitForTimeout(3000)
    await click(p, 'Test deg selv'); await p.waitForTimeout(2000)
    const answers = ['Bilen fra høyre', 'Jeg setter ned farten', 'Den skjuler trafikk', 'Den har vikeplikt for meg']
    for (let k = 0; k < answers.length; k++) {
      await click(p, answers[k]); await p.waitForTimeout(300); await click(p, 'Sjekk svar'); await p.waitForTimeout(1500)
      if (k === 1) await shot(p, '13-theory-learning-question')
      await click(p, 'Neste'); await p.waitForTimeout(1500)
    }
    await p.waitForTimeout(7000); await frames(p, 4); await shot(p, '18-mastery-result')
  },
  async 'theory-test'() {
    const p = await page(MOB); await p.goto(`${BASE}#/teori`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
    await click(p, 'Start'); await p.waitForTimeout(1500)
    for (let k = 0; k < 10; k++) {
      await p.evaluate(async (k) => {
        const { QUESTIONS } = await import('/src/learning/bank.ts')
        const txt = document.body.innerText
        const q = QUESTIONS.find((q) => txt.includes(q.prompt))
        const r = [...document.querySelectorAll('[role=radio]')]
        if (!q || !r.length) return 'nomatch'
        const right = q.answerOptions.find((o) => o.id === q.correctAnswer)?.text
        const pick = k === 3 || k === 7 ? r.find((b) => !b.textContent.includes(right)) : r.find((b) => b.textContent.includes(right))
        ;(pick ?? r[0]).click()
      }, k).then((x) => x && console.log('q', k, x))
      await p.waitForTimeout(400)
      if (k === 2) { await p.waitForTimeout(1500); await frames(p, 3); await shot(p, '14a-theory-test-question') }
      if (k < 9) { await click(p, 'Neste'); await p.waitForTimeout(1100) }
    }
    await click(p, 'Lever'); await p.waitForTimeout(800); await click(p, 'Lever', true); await p.waitForTimeout(2500)
    await shot(p, '14b-theory-test-result')
  },
  async 'practice-desktop'() { const p = await page(DESK); await p.goto(`${BASE}?quality=high#/ovelse`, { waitUntil: 'networkidle' }); await p.waitForTimeout(9000); await click(p, 'Start kjøringen'); await p.waitForTimeout(2000); await p.evaluate(() => window.__practiceRun(14, 'careful')); await frames(p, 3); await p.waitForTimeout(2500); await shot(p, '15-practice-desktop') },
  async 'practice-mobile'() { const p = await page(MOB); await p.goto(`${BASE}?quality=medium#/ovelse`, { waitUntil: 'networkidle' }); await p.waitForTimeout(11000); await click(p, 'Start kjøringen'); await p.waitForTimeout(2000); await p.evaluate(() => window.__practiceRun(22, 'careful')); await frames(p, 3); await p.waitForTimeout(2500); await shot(p, '16-practice-mobile') },
  async 'assessment'() { const p = await page(MOB); await p.goto(`${BASE}#/provekjoring`, { waitUntil: 'networkidle' }); await p.waitForTimeout(11000); await click(p, 'Start kjøringen'); await p.waitForTimeout(1500); await p.evaluate(() => window.__practiceRun(400, 'careless')); await p.waitForTimeout(3500); await shot(p, '17-driving-assessment') },
}
for (const [k, fn] of Object.entries(jobs)) {
  if (only && !only.includes(k)) continue
  try { await fn() } catch (e) { console.log('FAIL', k, e.message.split('\n')[0]) }
}
await browser.close()
