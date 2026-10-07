import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { BADGES, CATEGORY_LABELS } from '../../content/world'
import { levelFor, type ScenarioResult } from '../../engine/scoring'
import { CATEGORIES, type ScenarioContent, type ScenarioDef } from '../../engine/types'
import type { CompletionSummary } from '../../state/progress'
import { Flame, IconArrow, IconRetry, Star } from '../components/Icons'
import { CountUp } from './Overlays'

const ease = [0.16, 1, 0.3, 1] as const
const spring = [0.34, 1.56, 0.64, 1] as const

export function ResultScreen({
  def,
  content,
  result,
  summary,
  hasNext,
  onNext,
  onRetry,
  onMap,
}: {
  def: ScenarioDef
  content: ScenarioContent
  result: ScenarioResult
  summary: CompletionSummary
  hasNext: boolean
  onNext: () => void
  onRetry: () => void
  onMap: () => void
}) {
  const [stage, setStage] = useState(0)
  const levelUp = summary.levelAfter > summary.levelBefore
  const lvlAfter = levelFor(summary.xpAfter)
  const lvlBefore = levelFor(summary.xpBefore)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    at(250, () => setStage(1))
    for (let i = 0; i < 3; i++)
      at(700 + i * 260, () => {
        if (i < result.stars) {
          sfx.play('star')
          haptic(12)
        }
      })
    at(700, () => setStage(2))
    at(1600, () => {
      setStage(3)
      sfx.play('xp')
    })
    at(2300, () => {
      setStage(4)
      if (levelUp) {
        sfx.play('levelUp')
        haptic([20, 40, 20])
      }
    })
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [result.stars, levelUp])

  const headline = def.boss ? (result.total >= 65 ? 'Boss beseiret' : 'Boss fullført') : result.stars >= 3 ? 'Perfekt kjørt' : result.stars >= 2 ? 'Godt kjørt' : result.stars === 1 ? 'Fullført' : 'Ikke helt ennå'
  const cats = CATEGORIES.filter((c) => result.categories[c] !== undefined)

  return (
    <motion.div className="absolute inset-0 z-40 overflow-y-auto no-scrollbar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-md" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-full max-w-md flex-col px-5 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+22px)]">
        {/* header */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease }} className="text-center">
          <div className="eyebrow text-signal">{def.boss ? 'Boss · Byen' : content.title}</div>
          <h1 className="display mt-2 text-[clamp(34px,9.6vw,58px)]">{headline}</h1>
        </motion.div>

        {/* stars + grade */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -40, opacity: 0 }}
                animate={stage >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : {}}
                transition={{ delay: 0.45 + i * 0.26, duration: 0.6, ease: spring }}
                className={i === 1 ? '-translate-y-2' : ''}
              >
                <Star filled={i < result.stars} size={i === 1 ? 50 : 42} />
              </motion.div>
            ))}
          </div>
          <motion.div
            className="relative grid h-[80px] w-[80px] place-items-center rounded-[24px] bg-snow text-ink shadow-[0_7px_0_0_#a9a59b]"
            initial={{ scale: 0, rotate: 12 }}
            animate={stage >= 2 ? { scale: 1, rotate: -4 } : {}}
            transition={{ delay: 0.5, duration: 0.6, ease: spring }}
          >
            <span className="display text-[54px] leading-none">{result.grade}</span>
            <span className="num absolute -bottom-2 -right-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-black text-snow ring-1 ring-white/20">{result.total}%</span>
          </motion.div>
        </div>

        {/* categories */}
        <motion.div
          className="panel mt-6 rounded-[24px] p-4"
          initial={{ y: 30, opacity: 0 }}
          animate={stage >= 2 ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, ease }}
        >
          <div className="space-y-3">
            {cats.map((c, i) => {
              const v = result.categories[c]!
              const color = v >= 85 ? 'from-go to-[#9af5d2]' : v >= 60 ? 'from-signal to-[#ffe773]' : 'from-stop to-[#ff8a7f]'
              return (
                <div key={c}>
                  <div className="flex justify-between text-[12px] font-extrabold uppercase tracking-wide" style={{ fontStretch: '112%' }}>
                    <span className="text-mist">{CATEGORY_LABELS[c]}</span>
                    <span className="num">{stage >= 2 ? <CountUp value={v} duration={1} /> : 0} %</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${color}`}
                      initial={{ width: 0 }}
                      animate={stage >= 2 ? { width: `${Math.max(3, v)}%` } : {}}
                      transition={{ duration: 1, ease, delay: 0.15 + i * 0.12 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* xp + level + streak */}
        <motion.div className="panel mt-3 rounded-[22px] p-4" initial={{ y: 30, opacity: 0 }} animate={stage >= 3 ? { y: 0, opacity: 1 } : {}} transition={{ duration: 0.6, ease }}>
          <div className="flex items-center justify-between gap-3">
            <div className="num whitespace-nowrap text-[26px] font-black leading-none text-signal" style={{ fontStretch: '120%' }}>
              +{stage >= 3 ? <CountUp value={summary.xpAfter - summary.xpBefore} duration={1.1} /> : 0} XP
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 ring-1 ring-white/10">
              <Flame size={16} />
              <span className="num text-[14px] font-black">{summary.streakAfter}</span>
              <span className="text-[11px] font-bold text-fog">{summary.streakAfter === 1 ? 'dag' : 'dager'} på rad</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-fog" style={{ fontStretch: '112%' }}>
            <span>
              Level {lvlAfter.level} · {lvlAfter.name}
            </span>
            <span className="num">
              {summary.xpAfter} / {lvlAfter.to} XP
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-signal"
              initial={{ width: `${(levelUp ? 0 : lvlBefore.progress) * 100}%` }}
              animate={stage >= 3 ? { width: `${Math.max(0.03, lvlAfter.progress) * 100}%` } : {}}
              transition={{ duration: 1.2, ease, delay: 0.2 }}
            />
          </div>
        </motion.div>

        {levelUp && stage >= 4 && (
          <motion.div
            className="mt-3 overflow-hidden rounded-[22px] bg-signal p-4 text-ink"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: spring }}
          >
            <div className="eyebrow">Nytt nivå</div>
            <div className="display mt-1 text-[28px] leading-none">
              Level {lvlAfter.level} · {lvlAfter.name}
            </div>
          </motion.div>
        )}

        {result.badges.length > 0 && stage >= 4 && (
          <motion.div className="mt-3 flex flex-wrap gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {result.badges.map((b, i) => (
              <motion.span
                key={b}
                className="chip bg-go/12 text-go ring-go/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: spring }}
              >
                {BADGES[b].icon} {BADGES[b].title}
                {summary.newBadges.includes(b) && <span className="ml-1 rounded bg-go px-1 text-[9px] text-ink">NY</span>}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* takeaway */}
        <motion.div className="mt-3 rounded-[22px] bg-white/4 px-4 py-3 ring-1 ring-white/8" initial={{ opacity: 0 }} animate={stage >= 3 ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.3 }}>
          <div className="eyebrow text-fog">Husk</div>
          <p className="mt-1 text-[15px] font-semibold leading-snug">{content.takeaway}</p>
        </motion.div>

        <div className="flex-1" />

        {/* actions */}
        <motion.div className="mt-5 flex flex-col gap-3" initial={{ y: 20, opacity: 0 }} animate={stage >= 3 ? { y: 0, opacity: 1 } : {}} transition={{ duration: 0.6, ease, delay: 0.2 }}>
          {result.stars === 0 ? (
            <button className="btn btn-primary h-[58px] w-full text-[16px]" onClick={onRetry}>
              <IconRetry size={20} /> Prøv nivået igjen
            </button>
          ) : (
            <button className="btn btn-primary h-[58px] w-full text-[16px]" onClick={hasNext ? onNext : onMap}>
              {hasNext ? 'Neste nivå' : 'Til kartet'} <IconArrow size={20} />
            </button>
          )}
          <div className="flex gap-3">
            {result.stars === 0 ? (
              hasNext && (
                <button className="btn btn-ghost h-[48px] flex-1 text-[13px]" onClick={onNext}>
                  Neste nivå
                </button>
              )
            ) : (
              <button className="btn btn-ghost h-[48px] flex-1 text-[13px]" onClick={onRetry}>
                <IconRetry size={18} /> Kjør igjen
              </button>
            )}
            {hasNext && (
              <button className="btn btn-ghost h-[48px] flex-1 text-[13px]" onClick={onMap}>
                Kart
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
