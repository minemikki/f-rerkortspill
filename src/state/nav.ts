import { create } from 'zustand'

export type Screen = 'landing' | 'map' | 'play' | 'review' | 'theory' | 'practice'

/** hash ↔ screen. `practice` carries its control mode ('practice' | 'exam') in scenarioId. */
function hashFor(screen: Screen, id: string | null) {
  switch (screen) {
    case 'review':
      return '#/faglig'
    case 'map':
      return '#/kart'
    case 'play':
      return `#/kjor/${id}`
    case 'theory':
      return '#/teori'
    case 'practice':
      return id === 'exam' ? '#/provekjoring' : '#/ovelse'
    default:
      return ''
  }
}

interface NavState {
  screen: Screen
  scenarioId: string | null
  /** incremented on every navigation so screens can remount */
  nonce: number
  wiping: boolean
  go: (screen: Screen, scenarioId?: string | null) => void
  _commit: (screen: Screen, scenarioId: string | null) => void
  _done: () => void
  pending: { screen: Screen; scenarioId: string | null } | null
}

export function initialRoute(): { screen: Screen; scenarioId: string | null } {
  if (typeof location !== 'undefined') {
    if (location.hash === '#/faglig') return { screen: 'review', scenarioId: null }
    if (location.hash === '#/kart') return { screen: 'map', scenarioId: null }
    if (location.hash === '#/teori') return { screen: 'theory', scenarioId: null }
    if (location.hash === '#/ovelse') return { screen: 'practice', scenarioId: 'practice' }
    if (location.hash === '#/provekjoring') return { screen: 'practice', scenarioId: 'exam' }
    const m = location.hash.match(/^#\/kjor\/([\w-]+)$/)
    if (m) return { screen: 'play', scenarioId: m[1] }
  }
  return { screen: 'landing', scenarioId: null }
}

const initial = initialRoute()

export const useNav = create<NavState>()((set, get) => ({
  screen: initial.screen,
  scenarioId: initial.scenarioId,
  nonce: 0,
  wiping: false,
  pending: null,
  go: (screen, scenarioId = null) => {
    if (get().wiping) return
    set({ wiping: true, pending: { screen, scenarioId } })
  },
  _commit: (screen, scenarioId) => {
    set((s) => ({ screen, scenarioId, nonce: s.nonce + 1 }))
    const hash = hashFor(screen, scenarioId)
    try {
      history.replaceState(null, '', hash || location.pathname)
    } catch {
      /* ignore */
    }
  },
  _done: () => set({ wiping: false, pending: null }),
}))

// Support manual URL edits / back-forward between hash routes.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const r = initialRoute()
    const s = useNav.getState()
    if (r.screen !== s.screen || r.scenarioId !== s.scenarioId) s.go(r.screen, r.scenarioId)
  })
}
