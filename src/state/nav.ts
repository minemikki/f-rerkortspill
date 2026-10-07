import { create } from 'zustand'

export type Screen = 'landing' | 'map' | 'play' | 'review'

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
    const hash = screen === 'review' ? '#/faglig' : screen === 'map' ? '#/kart' : screen === 'play' ? `#/kjor/${scenarioId}` : ''
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
