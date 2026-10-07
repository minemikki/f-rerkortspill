import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { BADGES, WORLDS, type WorldDef } from '../../content/world'
import { levelFor } from '../../engine/scoring'
import { CONTENT, scenarioById } from '../../scenarios'
import { useNav } from '../../state/nav'
import { useProgress } from '../../state/progress'
import { Flame, IconArrow, IconBack, IconLock, IconPlay, Star } from '../components/Icons'
import { LevelRing } from '../components/LevelRing'

const ease = [0.16, 1, 0.3, 1] as const

const MECH_LABEL: Record<string, string> = {
  choice: 'Velg handling',
  priority: 'Hvem kjører først',
  spot: 'Trykk på faren',
  reaction: 'Brems i tide',
  scan: 'Skann',
  speed: 'Fart',
  lights: 'Blinklys',
  route: 'Plassering',
}

export function MapScreen() {
  const go = useNav((s) => s.go)
  const { xp, streak, results, badges } = useProgress()
  const [sheet, setSheet] = useState<string | null>(null)
  const lvl = levelFor(xp)
  const totalStars = Object.values(results).reduce((a, r) => a + r.stars, 0)

  return (
    <div className="relative h-full overflow-hidden bg-ink">
      <TopoBackground />
      {/* top HUD */}
      <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-ink via-ink/90 to-transparent px-4 pb-6 pt-[calc(var(--safe-top)+12px)]">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button aria-label="Tilbake" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/6 ring-1 ring-white/10" onClick={() => go('landing')}>
            <IconBack size={18} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white/6 py-1.5 pl-1.5 pr-4 ring-1 ring-white/10">
            <LevelRing level={lvl.level} progress={lvl.progress} size={40} />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-extrabold uppercase tracking-wide" style={{ fontStretch: '100%' }}>
                {lvl.name}
              </div>
              <div className="num text-[11px] font-semibold text-fog">
                {xp} / {lvl.to} XP
              </div>
            </div>
          </div>
          <div className="chip h-10 shrink-0 gap-2.5 px-3">
            <span className="flex items-center gap-1" title="Dager på rad">
              <Flame size={17} />
              <span className="num text-[14px]">{streak}</span>
            </span>
            <span className="h-4 w-px bg-white/15" />
            <span className="flex items-center gap-1" title="Stjerner">
              <Star filled size={15} />
              <span className="num text-[14px]">{totalStars}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 h-full overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-xl px-4 pb-[calc(var(--safe-bottom)+60px)] pt-[calc(var(--safe-top)+96px)]">
          {WORLDS.map((w) => (w.locked ? <LockedWorld key={w.id} w={w} /> : <OpenWorld key={w.id} w={w} onPick={setSheet} />))}
          {badges.length > 0 && (
            <div className="mt-14">
              <div className="eyebrow text-fog">Merker</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span key={b} className="chip">
                    <span className="text-signal">{BADGES[b].icon}</span> {BADGES[b].title}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-12 text-center text-[12px] leading-relaxed text-fog/80">
            Treningsverktøy — erstatter ikke obligatorisk opplæring.
          </p>
        </div>
      </div>

      <AnimatePresence>{sheet && <LevelSheet id={sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  )
}

/* ───────────── open world: the journey ───────────── */

function OpenWorld({ w, onPick }: { w: WorldDef; onPick: (id: string) => void }) {
  const results = useProgress((s) => s.results)
  const nodes = w.scenarios.map((id, i) => {
    const unlocked = i === 0 || !!results[w.scenarios[i - 1]]
    const done = !!results[id]
    return { id, i, unlocked, done, stars: results[id]?.stars ?? 0, boss: scenarioById(id)?.boss }
  })
  const current = nodes.find((n) => n.unlocked && !n.done)?.id ?? null
  const doneCount = nodes.filter((n) => n.done).length
  // node layout
  const ROW = 132
  const H = nodes.length * ROW + 40
  const xs = [50, 72, 30, 66, 50]
  const pts = nodes.map((_, i) => ({ x: xs[i % xs.length], y: 60 + i * ROW }))
  const pathD = useMemo(() => {
    let d = `M ${pts[0].x * 4} ${pts[0].y - 70}`
    d += ` L ${pts[0].x * 4} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      d += ` C ${a.x * 4} ${a.y + ROW * 0.55}, ${b.x * 4} ${b.y - ROW * 0.55}, ${b.x * 4} ${b.y}`
    }
    return d
  }, [pts])
  const progressFrac = Math.max(0, Math.min(1, (nodes.findIndex((n) => n.id === current) === -1 ? nodes.length : nodes.findIndex((n) => n.id === current)) / Math.max(1, nodes.length - 1)))

  return (
    <section className="relative">
      <CitySkyline />
      <div className="relative -mt-6">
        <div className="eyebrow flex items-center gap-2 text-signal">
          <span className="stripe inline-block h-[3px] w-8" /> Verden {w.index}
        </div>
        <div className="mt-1 flex items-end justify-between">
          <h2 className="display text-[64px] leading-[0.85]">{w.title}</h2>
          <div className="num pb-1 text-[13px] font-bold text-fog">
            {doneCount}/{nodes.length}
          </div>
        </div>
        <p className="mt-2 text-[14px] text-mist">{w.subtitle}</p>
      </div>

      <div className="relative mt-6" style={{ height: H }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 400 ${H}`} preserveAspectRatio="none" aria-hidden>
          <path d={pathD} stroke="#232b35" strokeWidth={44} fill="none" strokeLinecap="round" />
          <path d={pathD} stroke="#2c3540" strokeWidth={38} fill="none" strokeLinecap="round" />
          <path d={pathD} stroke="#ffd400" strokeOpacity={0.8} strokeWidth={3} fill="none" strokeDasharray="14 16" />
          <motion.path
            d={pathD}
            stroke="#2ee6a6"
            strokeOpacity={0.22}
            strokeWidth={38}
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progressFrac }}
            transition={{ duration: 1.4, ease }}
          />
        </svg>
        {nodes.map((n, i) => (
          <MapNode
            key={n.id}
            x={pts[i].x}
            y={pts[i].y}
            index={i}
            n={n}
            current={n.id === current}
            title={CONTENT[n.id]?.title ?? n.id}
            onClick={() => {
              if (!n.unlocked) {
                sfx.play('miss')
                haptic(20)
                return
              }
              sfx.unlock()
              sfx.play('select')
              haptic(10)
              onPick(n.id)
            }}
          />
        ))}
      </div>
    </section>
  )
}

function MapNode({
  x,
  y,
  index,
  n,
  current,
  title,
  onClick,
}: {
  x: number
  y: number
  index: number
  n: { unlocked: boolean; done: boolean; stars: number; boss?: boolean }
  current: boolean
  title: string
  onClick: () => void
}) {
  const size = n.boss ? 96 : 76
  const labelLeft = x > 55
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="relative" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}>
        {current && (
          <>
            <span className="pulse-ring absolute inset-0 rounded-full bg-signal/50" />
            <motion.div
              className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-snow px-3 py-1.5 text-[12px] font-black uppercase tracking-wider text-ink shadow-xl"
              style={{ fontStretch: '118%' }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              Start
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-snow" />
            </motion.div>
          </>
        )}
        <button
          onClick={onClick}
          aria-label={title}
          className={`relative grid h-full w-full place-items-center transition-transform duration-150 active:translate-y-[5px] ${
            n.boss ? 'rounded-[30px]' : 'rounded-full'
          } ${
            current
              ? 'bg-signal text-ink shadow-[0_7px_0_0_#c9a300,0_16px_30px_-6px_rgba(255,212,0,0.55)] active:shadow-[0_2px_0_0_#c9a300]'
              : n.done
                ? 'bg-[#e9e5dc] text-ink shadow-[0_7px_0_0_#a9a59b] active:shadow-[0_2px_0_0_#a9a59b]'
                : n.unlocked
                  ? 'bg-snow text-ink shadow-[0_7px_0_0_#a9a59b]'
                  : 'bg-ink-3 text-fog shadow-[0_7px_0_0_#07090c] ring-1 ring-white/8'
          }`}
        >
          {n.boss ? (
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ fontStretch: '120%' }}>
                Boss
              </span>
              {n.unlocked ? <BossIcon /> : <IconLock size={26} />}
            </div>
          ) : n.unlocked ? (
            n.done ? (
              <span className="display text-[30px]">{index + 1}</span>
            ) : (
              <IconPlay size={28} />
            )
          ) : (
            <IconLock size={24} />
          )}
        </button>
        {n.done && (
          <div className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 gap-0.5">
            {[0, 1, 2].map((s) => (
              <Star key={s} filled={s < n.stars} size={16} />
            ))}
          </div>
        )}
        <div
          onClick={onClick}
          className={`absolute top-1/2 w-[132px] -translate-y-1/2 cursor-pointer ${labelLeft ? 'right-full mr-4 text-right' : 'left-full ml-4'}`}
        >
          <div className="num text-[11px] font-bold text-fog">NIVÅ {index + 1}</div>
          <div className={`text-[15px] font-extrabold leading-tight ${n.unlocked ? 'text-snow' : 'text-fog'}`} style={{ fontStretch: '108%' }}>
            {title}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function BossIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" className="mt-1">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="currentColor" />
    </svg>
  )
}

/* ───────────── locked worlds ───────────── */

function LockedWorld({ w }: { w: WorldDef }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, ease }}
      className="relative mt-10 h-[210px] overflow-hidden rounded-[32px] ring-1 ring-white/8"
    >
      <WorldArt theme={w.theme} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <div>
          <div className="eyebrow text-fog">Verden {w.index}</div>
          <div className="display mt-1 text-[40px] leading-none text-snow/90">{w.title}</div>
          <div className="mt-2 text-[13px] text-mist">{w.subtitle}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 backdrop-blur">
            <IconLock size={18} />
          </div>
        </div>
      </div>
      <div className="absolute right-5 top-5 rounded-full bg-ink/60 px-3 py-1 text-[11px] font-bold text-fog ring-1 ring-white/10 backdrop-blur">{w.teaser}</div>
    </motion.section>
  )
}

function WorldArt({ theme }: { theme: WorldDef['theme'] }) {
  if (theme === 'country')
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sk-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d7a8f" />
            <stop offset="1" stopColor="#c7b38e" />
          </linearGradient>
        </defs>
        <rect width="400" height="210" fill="url(#sk-c)" />
        <path d="M0 120 L60 80 L120 110 L190 60 L260 105 L330 70 L400 100 V210 H0Z" fill="#4c5f6b" />
        <path d="M0 150 Q100 110 200 140 T400 130 V210 H0Z" fill="#3c5236" />
        <path d="M150 210 L195 140 L205 140 L250 210Z" fill="#2c3238" />
        <path d="M200 145 L200 210" stroke="#ffd400" strokeWidth="2" strokeDasharray="6 8" />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${20 + i * 27} ${150 - (i % 3) * 6} l8 -26 l8 26z`} fill="#22331f" />
        ))}
      </svg>
    )
  if (theme === 'dark')
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="210" fill="#070a14" />
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 110} r={(i % 3) * 0.5 + 0.5} fill="#fff" opacity={0.3 + (i % 4) * 0.15} />
        ))}
        <path d="M0 140 L80 110 L160 130 L260 100 L400 125 V210 H0Z" fill="#0d1220" />
        <path d="M160 210 L198 130 L202 130 L240 210Z" fill="#141a26" />
        <path d="M185 210 L200 130 L215 210Z" fill="url(#beam)" opacity="0.5" />
        <defs>
          <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff6d0" />
            <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="300" cy="148" r="2.5" fill="#d9ffcf" />
        <circle cx="308" cy="148" r="2.5" fill="#d9ffcf" />
      </svg>
    )
  if (theme === 'winter')
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="210" fill="#9fb1c1" />
        <path d="M0 120 L70 60 L130 100 L200 40 L270 95 L340 55 L400 90 V210 H0Z" fill="#dfe7ee" />
        <path d="M0 150 Q120 125 220 145 T400 140 V210 H0Z" fill="#f4f7f9" />
        <path d="M160 210 L198 145 L202 145 L240 210Z" fill="#8d97a1" />
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={(i * 71) % 400} cy={(i * 37) % 200} r={1.5} fill="#fff" opacity={0.8} />
        ))}
      </svg>
    )
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="210" fill="#3d3a33" />
      <path d="M0 110 L400 100 V210 H0Z" fill="#2b2a27" />
      <path d="M60 210 L190 105 L210 105 L340 210Z" fill="#33363a" />
      {[-1, 0, 1].map((k) => (
        <path key={k} d={`M${200 + k * 45} 210 L${200 + k * 7} 105`} stroke={k === 0 ? '#ffd400' : '#f4f1ea'} strokeWidth="2.5" strokeDasharray="10 12" />
      ))}
      <rect x="250" y="70" width="70" height="22" rx="3" fill="#1f6f3a" />
      <rect x="284" y="92" width="3" height="20" fill="#aaa" />
    </svg>
  )
}

function CitySkyline() {
  return (
    <svg className="pointer-events-none -mx-4 block h-[120px] w-[calc(100%+2rem)]" viewBox="0 0 480 120" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0e13" stopOpacity="0" />
          <stop offset="0.7" stopColor="#141b24" stopOpacity="0.6" />
          <stop offset="1" stopColor="#0a0e13" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="480" height="120" fill="url(#sky-city)" />
      <g fill="#1a222c">
        <path d="M0 120 V80 h30 v-20 l15 -14 l15 14 v20 h20 v-30 h40 v30 h12 V40 l6 -30 l6 30 v80Z" />
        <path d="M150 120 V70 l25 -22 l25 22 v50Z" />
        <path d="M205 120 V55 h50 v65Z" />
        <path d="M260 120 V76 l20 -18 l20 18 v44Z" />
        <path d="M305 120 V48 h36 v72Z" />
        <path d="M345 120 V82 l18 -16 l18 16 v38Z" />
        <path d="M385 120 V62 h44 v58Z" />
        <path d="M432 120 V78 l24 -20 l24 20 v42Z" />
      </g>
      <g fill="#ffd400" opacity="0.5">
        {[
          [215, 66],
          [235, 80],
          [318, 60],
          [318, 80],
          [400, 74],
          [412, 90],
          [92, 66],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="5" height="6" />
        ))}
      </g>
    </svg>
  )
}

function TopoBackground() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
      <defs>
        <pattern id="topo" width="220" height="220" patternUnits="userSpaceOnUse">
          {[30, 55, 80, 105].map((r) => (
            <ellipse key={r} cx="110" cy="110" rx={r * 1.1} ry={r * 0.8} fill="none" stroke="#fff" strokeWidth="1" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo)" />
    </svg>
  )
}

/* ───────────── level sheet ───────────── */

function LevelSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const go = useNav((s) => s.go)
  const def = scenarioById(id)!
  const c = CONTENT[id]
  const rec = useProgress((s) => s.results[id])
  const idx = WORLDS[0].scenarios.indexOf(id)
  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="panel relative w-full max-w-md rounded-t-[34px] p-6 pb-[calc(var(--safe-bottom)+24px)] md:rounded-[34px]"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.45, ease }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15 md:hidden" />
        <div className="flex items-center justify-between">
          <div className="eyebrow text-signal">{def.boss ? 'Boss' : `Nivå ${idx + 1}`}</div>
          {rec && (
            <div className="flex gap-0.5">
              {[0, 1, 2].map((s) => (
                <Star key={s} filled={s < rec.stars} size={18} />
              ))}
            </div>
          )}
        </div>
        <h3 className="display-tight mt-2 text-[38px]">{c.title}</h3>
        <p className="mt-2 text-[15px] text-mist">{c.tagline}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {def.mechanics.map((m) => (
            <span key={m} className="chip">
              {MECH_LABEL[m] ?? m}
            </span>
          ))}
          <span className="chip">
            Vanskelighet{' '}
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`inline-block h-1.5 w-1.5 rounded-full ${i < def.difficulty ? 'bg-signal' : 'bg-white/15'}`} />
            ))}
          </span>
        </div>
        <div className="mt-5 rounded-2xl bg-white/4 p-4 ring-1 ring-white/8">
          <div className="eyebrow text-fog">Du lærer</div>
          <p className="mt-1.5 text-[14px] leading-snug text-snow">{c.learningObjective}</p>
        </div>
        <button
          className="btn btn-primary mt-6 h-[62px] w-full text-[17px]"
          onClick={() => {
            sfx.unlock()
            sfx.play('whoosh')
            haptic(15)
            go('play', id)
          }}
        >
          {rec ? 'Kjør igjen' : 'Kjør'} <IconArrow size={20} />
        </button>
      </motion.div>
    </motion.div>
  )
}
