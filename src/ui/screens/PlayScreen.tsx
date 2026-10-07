import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { WORLDS } from '../../content/world'
import { ScenarioRunner, type UIEvent } from '../../engine/runner'
import type { SimEvent } from '../../engine/sim'
import { CONTENT, scenarioById } from '../../scenarios'
import { useNav } from '../../state/nav'
import { useProgress, type CompletionSummary } from '../../state/progress'
import {
  ActorLabels,
  BrakeButton,
  ChoiceOverlay,
  FeedbackToast,
  ImpactFlash,
  IntroCard,
  Letterbox,
  MistakeCard,
  ReplayBadge,
  SpotOverlay,
  Speedo,
  TapRipples,
  TopHud,
  useRaf,
} from '../play/Overlays'
import { ResultScreen } from '../play/ResultScreen'

const ScenarioCanvas = lazy(() => import('../../three/GameScene').then((m) => ({ default: m.ScenarioCanvas })))

export function PlayScreen({ scenarioId }: { scenarioId: string }) {
  const [attempt, setAttempt] = useState(0)
  return <PlaySession key={`${scenarioId}-${attempt}`} scenarioId={scenarioId} onRestart={() => setAttempt((a) => a + 1)} />
}

function PlaySession({ scenarioId, onRestart }: { scenarioId: string; onRestart: () => void }) {
  const go = useNav((s) => s.go)
  const def = scenarioById(scenarioId)!
  const content = CONTENT[scenarioId]
  const runner = useMemo(() => new ScenarioRunner(def), [def])
  const ui = useSyncExternalStore(
    useCallback((cb) => runner.subscribe(cb), [runner]),
    () => runner.ui,
  )
  const completeScenario = useProgress((s) => s.completeScenario)
  const [summary, setSummary] = useState<CompletionSummary | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [impact, setImpact] = useState(0)
  const [shakeScope, animateShake] = useAnimate()
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; ok: boolean | null }>>([])
  const [confirmExit, setConfirmExit] = useState(false)
  const lastTap = useRef<{ x: number; y: number } | null>(null)
  const world = WORLDS[0]
  const levelIndex = world.scenarios.indexOf(scenarioId)
  const nextId = world.scenarios[levelIndex + 1]

  /* ───── audio lifecycle ───── */
  useEffect(() => {
    sfx.unlock()
    sfx.startEngine()
    sfx.startAmbience()
    return () => {
      sfx.stopEngine()
      sfx.stopAmbience()
    }
  }, [])

  const playerIdx = useMemo(() => runner.sim.actors.findIndex((a) => a.def.id === 'player'), [runner])
  const indOn = useRef(false)
  useRaf(() => {
    const v = runner.sim.actors[playerIdx].view
    const live = runner.phase !== 'replay'
    sfx.setEngine(v.v, v.a, live ? Math.max(0.15, runner.timeScale) : 0.6)
    const on = v.indicator !== null && Math.floor(performance.now() / 385) % 2 === 0
    if (on !== indOn.current) {
      indOn.current = on
      if (v.indicator) sfx.play('tick', { volume: on ? 1 : 0.6 })
    }
  })

  const onSimEvents = useCallback(
    (events: SimEvent[]) => {
      const p = runner.sim.actors[playerIdx].view
      for (const e of events) {
        if (e.type !== 'sound') continue
        let vol = 1
        if (e.actor) {
          const a = runner.sim.byId.get(e.actor)
          if (a) {
            const d = Math.hypot(a.view.x - p.x, a.view.z - p.z)
            vol = Math.max(0.15, Math.min(1, 14 / (d + 4)))
          }
        }
        sfx.play(e.sound, { volume: vol })
      }
    },
    [runner, playerIdx],
  )

  const onUIEvents = useCallback(
    (events: UIEvent[]) => {
    for (const e of events) {
      switch (e.type) {
        case 'stepStart':
          if (e.kind !== 'reaction') {
            sfx.play('stepStart')
            haptic(15)
          }
          break
        case 'found': {
          sfx.play('found')
          haptic(18)
          const t = lastTap.current
          if (t) setRipples((r) => [...r.slice(-5), { id: performance.now(), x: t.x, y: t.y, ok: true }])
          break
        }
        case 'wrongTap': {
          sfx.play('miss')
          haptic([10, 30, 10])
          if (shakeScope.current) animateShake(shakeScope.current, { x: [0, -8, 7, -4, 2, 0] }, { duration: 0.35 })
          const t = lastTap.current
          if (t) setRipples((r) => [...r.slice(-5), { id: performance.now(), x: t.x, y: t.y, ok: false }])
          break
        }
        case 'resolve':
          if (e.result === 'perfect') {
            sfx.play('correct')
            setTimeout(() => sfx.play('xp'), 380)
            haptic([12, 40, 18])
          } else if (e.result === 'good' || e.result === 'partial') {
            sfx.play('good', { volume: e.result === 'partial' ? 0.7 : 1 })
          }
          break
        case 'impact':
          sfx.play('impact')
          haptic([60, 40, 90])
          setImpact((i) => i + 1)
          break
        case 'complete':
          break
      }
    }
    },
    [animateShake, shakeScope],
  )

  /* ───── completion ───── */
  const committed = useRef(false)
  useEffect(() => {
    if (ui.phase === 'complete' && ui.result && !committed.current) {
      committed.current = true
      const s = completeScenario(ui.result)
      setSummary(s)
      const t = setTimeout(() => setShowResult(true), 1100)
      return () => clearTimeout(t)
    }
  }, [ui.phase, ui.result, completeScenario])

  /* ───── inputs ───── */
  const choose = useCallback(
    (id: string) => {
      sfx.play('select')
      haptic(10)
      runner.choose(id)
    },
    [runner],
  )
  const brake = useCallback(() => {
    haptic(25)
    runner.brake()
  }, [runner])

  const phase = ui.phase
  const inStep = phase === 'step' && ui.step
  const showHud = phase !== 'intro' && phase !== 'complete' && phase !== 'replay'
  const blocking = ui.feedback?.blocking && phase === 'feedback'
  const toast = ui.feedback && !ui.feedback.blocking

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <div
        ref={shakeScope}
        className="absolute inset-0"
        onPointerDownCapture={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          lastTap.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
          if (phase === 'step' && ui.step?.kind === 'spot') {
            const id = performance.now()
            setRipples((r) => [...r.slice(-5), { id, x: lastTap.current!.x, y: lastTap.current!.y, ok: null }])
          }
        }}
      >
        <div
          className="absolute inset-0 transition-[filter] duration-500"
          style={{ filter: inStep ? 'saturate(0.6) brightness(0.92)' : phase === 'replay' ? 'saturate(0.75) contrast(1.05)' : 'none' }}
        >
          <Suspense fallback={<div className="grid h-full place-items-center text-fog">Laster …</div>}>
            <ScenarioCanvas runner={runner} onSimEvents={onSimEvents} onUIEvents={onUIEvents} />
          </Suspense>
        </div>
      </div>

      <ActorLabels ui={ui} def={def} content={content} />
      <TapRipples ripples={ripples} />
      <Letterbox on={phase === 'intro' || phase === 'replay' || phase === 'impact'} />
      <IntroCard show={phase === 'intro'} level={levelIndex + 1} content={content} boss={def.boss} />
      <TopHud ui={ui} visible={showHud && !showResult} onClose={() => setConfirmExit(true)} />
      <Speedo runner={runner} visible={showHud && !inStep && !blocking && !showResult} />
      <ReplayBadge show={phase === 'replay'} />

      <AnimatePresence>
        {inStep && ui.step!.kind === 'choice' && <ChoiceOverlay key={`c-${ui.step!.id}-${ui.step!.attempt}`} ui={ui} runner={runner} content={content} onChoose={choose} />}
        {inStep && ui.step!.kind === 'spot' && <SpotOverlay key={`s-${ui.step!.id}-${ui.step!.attempt}`} ui={ui} runner={runner} content={content} />}
      </AnimatePresence>
      {ui.reaction && phase === 'drive' && <BrakeButton ui={ui} onBrake={brake} content={content} />}
      <AnimatePresence>{toast && <FeedbackToast key={`t-${ui.feedback!.stepId}-${ui.feedback!.outcomeId}`} ui={ui} content={content} onDismiss={() => runner.continue()} />}</AnimatePresence>
      <AnimatePresence>
        {blocking && (
          <MistakeCard
            key={`m-${ui.feedback!.stepId}-${ui.feedback!.attempt}`}
            ui={ui}
            def={def}
            content={content}
            onRetry={() => {
              sfx.play('whoosh')
              runner.retry()
            }}
            onContinue={() => {
              sfx.play('tap')
              runner.continue()
            }}
            onReplay={() => runner.replayAgain()}
          />
        )}
      </AnimatePresence>
      <ImpactFlash trigger={impact} />

      <AnimatePresence>
        {showResult && ui.result && summary && (
          <ResultScreen
            def={def}
            content={content}
            result={ui.result}
            summary={summary}
            hasNext={!!nextId}
            onNext={() => go('play', nextId)}
            onRetry={onRestart}
            onMap={() => go('map')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmExit && (
          <motion.div className="absolute inset-0 z-50 grid place-items-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => setConfirmExit(false)} />
            <motion.div className="panel relative w-full max-w-sm rounded-[28px] p-6 text-center" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="display-tight text-[28px]">Avslutte nivået?</h3>
              <p className="mt-2 text-[14px] text-mist">Fremgangen i dette nivået lagres ikke.</p>
              <div className="mt-6 flex gap-3">
                <button className="btn btn-ghost h-[52px] flex-1 text-[14px]" onClick={() => setConfirmExit(false)}>
                  Fortsett
                </button>
                <button className="btn btn-primary h-[52px] flex-1 text-[14px]" onClick={() => go('map')}>
                  Avslutt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
