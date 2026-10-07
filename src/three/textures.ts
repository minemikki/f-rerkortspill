import * as THREE from 'three'

/**
 * Procedural canvas textures — no external assets needed. Everything is
 * generated once and cached.
 */

const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: boolean; srgb?: boolean } = {}) {
  const hit = cache.get(key)
  if (hit) return hit
  const [c, g] = canvas(w, h)
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
  }
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

// deterministic noise
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function asphaltTexture() {
  return make(
    'asphalt',
    512,
    512,
    (g, w, h) => {
      g.fillStyle = '#5b6068'
      g.fillRect(0, 0, w, h)
      const r = rng(7)
      for (let i = 0; i < 26000; i++) {
        const v = 70 + r() * 60
        g.fillStyle = `rgba(${v},${v + 3},${v + 8},${0.12 + r() * 0.18})`
        g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5)
      }
      // patches & cracks
      for (let i = 0; i < 9; i++) {
        g.fillStyle = `rgba(40,44,50,${0.05 + r() * 0.06})`
        g.beginPath()
        g.ellipse(r() * w, r() * h, 30 + r() * 80, 20 + r() * 50, r() * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.strokeStyle = 'rgba(35,38,44,0.35)'
      g.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        let x = r() * w
        let y = r() * h
        g.beginPath()
        g.moveTo(x, y)
        for (let k = 0; k < 8; k++) {
          x += (r() - 0.5) * 30
          y += (r() - 0.5) * 30
          g.lineTo(x, y)
        }
        g.stroke()
      }
    },
    { repeat: true },
  )
}

export function paverTexture() {
  return make(
    'pavers',
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#b9b6ae'
      g.fillRect(0, 0, w, h)
      const r = rng(3)
      const s = 32
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          const v = 170 + r() * 22
          g.fillStyle = `rgb(${v},${v - 2},${v - 8})`
          g.fillRect(x + 1, y + 1, s - 2, s - 2)
        }
      }
      for (let i = 0; i < 3000; i++) {
        g.fillStyle = `rgba(90,90,90,${r() * 0.12})`
        g.fillRect(r() * w, r() * h, 1, 1)
      }
    },
    { repeat: true },
  )
}

export function grassTexture() {
  return make(
    'grass',
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#7b8f5a'
      g.fillRect(0, 0, w, h)
      const r = rng(11)
      // large soft patches for variation
      for (let i = 0; i < 18; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(160,150,90,0.10)' : 'rgba(60,85,50,0.12)'
        g.beginPath()
        g.ellipse(r() * w, r() * h, 20 + r() * 50, 16 + r() * 40, r() * 3, 0, Math.PI * 2)
        g.fill()
      }
      for (let i = 0; i < 9000; i++) {
        const gg = 115 + r() * 50
        g.fillStyle = `rgba(${90 + r() * 40},${gg},${60 + r() * 30},${0.2 + r() * 0.25})`
        g.fillRect(r() * w, r() * h, 1, 2 + r() * 2)
      }
    },
    { repeat: true },
  )
}

export function gravelTexture() {
  return make(
    'gravel',
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#a49c8c'
      g.fillRect(0, 0, w, h)
      const r = rng(5)
      for (let i = 0; i < 9000; i++) {
        const v = 120 + r() * 90
        g.fillStyle = `rgba(${v},${v - 6},${v - 16},0.5)`
        g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2)
      }
    },
    { repeat: true },
  )
}

/** Facade texture for apartment blocks: window grid on a plaster colour. */
export function facadeTexture(base: string, floors: number, cols: number, seed: number) {
  return make(`facade-${base}-${floors}-${cols}-${seed}`, 256, 256 * (floors / cols) || 256, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rng(seed)
    // subtle plaster noise
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.04})`
      g.fillRect(r() * w, r() * h, 2, 2)
    }
    const cw = w / cols
    const fh = h / floors
    for (let f = 0; f < floors; f++) {
      // cornice line
      g.fillStyle = 'rgba(255,255,255,0.12)'
      g.fillRect(0, f * fh + fh - 3, w, 2)
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.22
        const y = f * fh + fh * 0.2
        const ww = cw * 0.56
        const wh = fh * (f === floors - 1 ? 0.62 : 0.56)
        // frame
        g.fillStyle = 'rgba(245,242,235,0.9)'
        g.fillRect(x - 2, y - 2, ww + 4, wh + 4)
        // glass: sky reflection or warm interior
        const warm = r() < 0.18
        const grad = g.createLinearGradient(x, y, x, y + wh)
        if (warm) {
          grad.addColorStop(0, '#f3c77a')
          grad.addColorStop(1, '#c98e4a')
        } else {
          grad.addColorStop(0, '#9fb3c4')
          grad.addColorStop(1, '#3d4c5a')
        }
        g.fillStyle = grad
        g.fillRect(x, y, ww, wh)
        g.fillStyle = 'rgba(245,242,235,0.9)'
        g.fillRect(x + ww / 2 - 1, y, 2, wh)
      }
    }
    // ground floor shop band
    g.fillStyle = 'rgba(30,30,30,0.18)'
    g.fillRect(0, h - fh, w, fh)
  })
}

/** Wooden house cladding (vertical boards) with windows painted on. */
export function claddingTexture(color: string) {
  return make(`clad-${color}`, 128, 128, (g, w, h) => {
    g.fillStyle = color
    g.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = 'rgba(0,0,0,0.10)'
      g.fillRect(x, 0, 1, h)
      g.fillStyle = 'rgba(255,255,255,0.06)'
      g.fillRect(x + 1, 0, 1, h)
    }
  }, { repeat: true })
}

export function roofTexture(color: string) {
  return make(`roof-${color}`, 128, 128, (g, w, h) => {
    g.fillStyle = color
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = 'rgba(0,0,0,0.18)'
      g.fillRect(0, y, w, 2)
      for (let x = (y / 10) % 2 ? 0 : 8; x < w; x += 16) {
        g.fillStyle = 'rgba(0,0,0,0.08)'
        g.fillRect(x, y, 1, 10)
      }
    }
  }, { repeat: true })
}

/* ─────────────── Norwegian traffic signs ─────────────── */

/** 516 Gangfelt — blue square, white triangle, black pedestrian on stripes. */
export function signGangfelt() {
  return make('sign-516', 256, 256, (g, w) => {
    roundRect(g, 4, 4, w - 8, w - 8, 18, '#ffffff')
    roundRect(g, 12, 12, w - 24, w - 24, 12, '#1d4f9c')
    // white triangle
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.moveTo(w / 2, 34)
    g.lineTo(w - 34, w - 46)
    g.lineTo(34, w - 46)
    g.closePath()
    g.fill()
    // stripes
    g.fillStyle = '#111'
    for (let i = 0; i < 4; i++) g.fillRect(70 + i * 30, w - 70, 18, 10)
    // pedestrian
    g.save()
    g.translate(w / 2 + 2, 150)
    g.fillStyle = '#111'
    g.beginPath()
    g.arc(4, -62, 11, 0, Math.PI * 2)
    g.fill()
    g.lineCap = 'round'
    g.strokeStyle = '#111'
    g.lineWidth = 13
    line(g, 0, -46, -4, -6) // torso
    g.lineWidth = 10
    line(g, -4, -6, -22, 30) // back leg
    line(g, -4, -6, 16, 14)
    line(g, 16, 14, 18, 32) // front leg
    line(g, 0, -40, -20, -16) // arm
    line(g, 0, -40, 18, -20)
    g.restore()
  })
}

/** 202 Vikeplikt — downward triangle, red border, white field. */
export function signVikeplikt() {
  return make('sign-202', 256, 256, (g, w) => {
    g.fillStyle = '#ffffff'
    tri(g, w / 2, w - 18, 14, 30, w - 14, 30)
    g.fill()
    g.fillStyle = '#d0202a'
    tri(g, w / 2, w - 30, 26, 36, w - 26, 36)
    g.fill()
    g.fillStyle = '#ffffff'
    tri(g, w / 2, w - 74, 64, 58, w - 64, 58)
    g.fill()
  })
}

/** 362 Fartsgrense — white disc with red ring and black numerals. */
export function signFartsgrense(n: number) {
  return make(`sign-362-${n}`, 256, 256, (g, w) => {
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#d0202a'
    g.beginPath()
    g.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(w / 2, w / 2, w / 2 - 44, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111'
    g.font = '900 104px "Archivo Variable", Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(n), w / 2, w / 2 + 6)
  })
}

/** 512 Holdeplass for buss (simplified: blue sign with white bus pictogram). */
export function signBuss() {
  return make('sign-512', 256, 256, (g, w) => {
    roundRect(g, 4, 4, w - 8, w - 8, 18, '#ffffff')
    roundRect(g, 12, 12, w - 24, w - 24, 12, '#1d4f9c')
    roundRect(g, 46, 70, w - 92, 100, 14, '#ffffff')
    g.fillStyle = '#1d4f9c'
    g.fillRect(60, 84, 40, 34)
    g.fillRect(108, 84, 40, 34)
    g.fillRect(156, 84, 40, 34)
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(84, 182, 16, 0, Math.PI * 2)
    g.arc(172, 182, 16, 0, Math.PI * 2)
    g.fill()
  })
}

/** Small street name plate (blue, white text) — typical Norwegian. */
export function streetPlate(name: string) {
  return make(`plate-${name}`, 512, 128, (g, w, h) => {
    roundRect(g, 2, 2, w - 4, h - 4, 10, '#ffffff')
    roundRect(g, 8, 8, w - 16, h - 16, 6, '#1d4f9c')
    g.fillStyle = '#fff'
    g.font = '700 64px "Archivo Variable", Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(name, w / 2, h / 2 + 3)
  })
}

export function shopSign(text: string, bg: string, fg: string) {
  return make(`shop-${text}-${bg}`, 512, 128, (g, w, h) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.fillStyle = fg
    g.font = '800 70px "Archivo Variable", Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 4)
  })
}

/** Radial soft blob used for contact shadows and glows. */
export function blobTexture() {
  return make('blob', 128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    grad.addColorStop(0, 'rgba(0,0,0,0.55)')
    grad.addColorStop(0.55, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, w)
  }, { srgb: false })
}

export function ringTexture() {
  return make('ring', 256, 256, (g, w) => {
    g.strokeStyle = '#ffffff'
    g.lineWidth = 14
    g.beginPath()
    g.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2)
    g.stroke()
    const grad = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2 - 20)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(1, 'rgba(255,255,255,0.35)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(w / 2, w / 2, w / 2 - 20, 0, Math.PI * 2)
    g.fill()
  })
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.fillStyle = fill
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
  g.fill()
}

function tri(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.closePath()
}

function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.stroke()
}
