import { useEffect, useRef, useState } from 'react'

/**
 * Tiny on-device performance readout, for testing on real phones:
 * open any page with `?fps` (sticks in localStorage; `?fps=0` turns it off).
 * Shows average FPS, the worst frame of the last second, the current
 * render tier and the device pixel ratio.
 */
function enabled() {
  try {
    const q = new URLSearchParams(location.search).get('fps')
    if (q !== null) localStorage.setItem('kjor-fps', q === '0' ? '0' : '1')
    return localStorage.getItem('kjor-fps') === '1'
  } catch {
    return false
  }
}

export function FpsMeter() {
  const [on] = useState(enabled)
  const [txt, setTxt] = useState('')
  const raf = useRef(0)
  useEffect(() => {
    if (!on) return
    let last = performance.now()
    let t0 = last
    let n = 0
    let worst = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      n++
      if (dt > worst) worst = dt
      if (now - t0 >= 1000) {
        const fps = Math.round((n * 1000) / (now - t0))
        const tier = document.documentElement.dataset.kjorTier ?? '–'
        setTxt(`${fps} fps · verste ${Math.round(worst)} ms · ${tier} · dpr ${window.devicePixelRatio}`)
        t0 = now
        n = 0
        worst = 0
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [on])
  if (!on) return null
  return (
    <div className="num pointer-events-none fixed bottom-[calc(var(--safe-bottom)+4px)] left-1/2 z-[100] -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-[#2ee6a6]">
      {txt || 'måler …'}
    </div>
  )
}
