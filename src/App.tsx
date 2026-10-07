import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useNav } from './state/nav'
import { Landing } from './ui/screens/Landing'
import { MapScreen } from './ui/screens/MapScreen'
import { PlayScreen } from './ui/screens/PlayScreen'
import { ReviewScreen } from './ui/screens/ReviewScreen'

/**
 * Screen transitions are a yellow road-stripe wipe: the slab covers the
 * screen, the next screen mounts underneath, then the slab exits.
 */
export default function App() {
  const { screen, scenarioId, nonce, wiping, pending, _commit, _done } = useNav()

  useEffect(() => {
    if (!wiping || !pending) return
    const t1 = setTimeout(() => _commit(pending.screen, pending.scenarioId), 420)
    const t2 = setTimeout(() => _done(), 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [wiping, pending, _commit, _done])

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <div key={`${screen}-${nonce}`} className="absolute inset-0">
        {screen === 'landing' && <Landing />}
        {screen === 'map' && <MapScreen />}
        {screen === 'play' && scenarioId && <PlayScreen scenarioId={scenarioId} />}
        {screen === 'review' && <ReviewScreen />}
      </div>
      <AnimatePresence>
        {wiping && (
          <motion.div key="wipe" className="pointer-events-auto absolute inset-0 z-[100]" initial="in" animate="cover" exit="out">
            <motion.div
              className="absolute inset-y-0 -left-[20%] w-[140%] bg-signal"
              style={{ skewX: -12 }}
              variants={{ in: { x: '-110%' }, cover: { x: '0%' }, out: { x: '110%' } }}
              transition={{ duration: 0.42, ease: [0.76, 0, 0.24, 1] }}
            />
            <motion.div
              className="absolute inset-y-0 -left-[20%] w-[140%] bg-ink"
              style={{ skewX: -12 }}
              variants={{ in: { x: '-125%' }, cover: { x: '0%' }, out: { x: '125%' } }}
              transition={{ duration: 0.42, ease: [0.76, 0, 0.24, 1], delay: 0.06 }}
            />
            <motion.div
              className="absolute inset-0 grid place-items-center"
              variants={{ in: { opacity: 0 }, cover: { opacity: 1 }, out: { opacity: 0 } }}
              transition={{ duration: 0.2, delay: 0.25 }}
            >
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2.5 w-10 rounded-full bg-signal"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
