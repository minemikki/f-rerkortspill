/**
 * Screen anchors: DOM elements that follow 3D actors (labels over hazards).
 * The 3D layer projects actor positions each frame and writes CSS transforms
 * directly — no React re-renders.
 */
const anchors = new Map<string, HTMLElement>()

export function registerAnchor(id: string, el: HTMLElement | null) {
  if (el) anchors.set(id, el)
  else anchors.delete(id)
}

export function anchorEntries() {
  return anchors
}
