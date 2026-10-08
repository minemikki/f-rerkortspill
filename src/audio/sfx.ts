/**
 * Procedural WebAudio sound design — no audio files needed (placeholder
 * quality, deliberately subtle: no arcade-racing sounds). The API
 * (play('horn'), setEngine(...)) stays the same when recorded samples
 * arrive — see docs/LEARNING_SYSTEMS.md › Audio for the recording list.
 *
 * Layers: engine (harmonic, load-dependent), tyre/road noise, brake scrub,
 * street ambience (distant traffic, wind in leaves, birds), cues.
 */

type Id =
  | 'horn'
  | 'bell'
  | 'screech'
  | 'whoosh'
  | 'ballBounce'
  | 'kidShout'
  | 'tick'
  | 'tap'
  | 'select'
  | 'correct'
  | 'good'
  | 'wrong'
  | 'impact'
  | 'xp'
  | 'found'
  | 'miss'
  | 'star'
  | 'levelUp'
  | 'stepStart'
  | 'countdown'
  | 'rewind'

class Sfx {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  private engine: {
    partials: OscillatorNode[]
    gain: GainNode
    filter: BiquadFilterNode
    tyre: GainNode
    tyreF: BiquadFilterNode
    scrub: GainNode
    lfo: OscillatorNode
    srcs: AudioScheduledSourceNode[]
  } | null = null
  private ambienceNodes: AudioScheduledSourceNode[] = []
  private ambience: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private birdTimer: number | null = null
  muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem('kjor-muted') === '1'
    } catch {
      /* ignore */
    }
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.8
    this.master.connect(comp)
    comp.connect(this.ctx.destination)
    const len = this.ctx.sampleRate * 2
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    let b0 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.97 * b0 + 0.03 * w
      d[i] = b0 * 3 + w * 0.15
    }
  }

  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem('kjor-muted', m ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05)
  }

  private noise(dur: number) {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    src.start()
    src.stop(this.ctx!.currentTime + dur)
    return src
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec)
  }

  private tone(freq: number, type: OscillatorType, t: number, dur: number, peak: number, attack = 0.005, dest?: AudioNode) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    this.env(g, t, attack, peak, dur)
    o.connect(g)
    g.connect(dest ?? this.master!)
    o.start(t)
    o.stop(t + attack + dur + 0.05)
    return o
  }

  play(id: Id, opts: { volume?: number } = {}) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime + 0.005
    const v = opts.volume ?? 1
    switch (id) {
      case 'tap':
        this.tone(1400, 'sine', t, 0.05, 0.12 * v)
        break
      case 'select':
        this.tone(660, 'triangle', t, 0.08, 0.2 * v)
        this.tone(990, 'sine', t + 0.03, 0.1, 0.12 * v)
        break
      case 'stepStart': {
        // tension swell
        const n = this.noise(0.6)
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.setValueAtTime(300, t)
        f.frequency.exponentialRampToValueAtTime(1800, t + 0.45)
        const g = ctx.createGain()
        this.env(g, t, 0.25, 0.14 * v, 0.3)
        n.connect(f)
        f.connect(g)
        g.connect(this.master)
        this.tone(220, 'sine', t, 0.5, 0.08 * v, 0.2)
        break
      }
      case 'countdown':
        this.tone(880, 'square', t, 0.03, 0.05 * v)
        break
      case 'correct':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 'triangle', t + i * 0.065, 0.28, 0.17 * v))
        this.tone(2093, 'sine', t + 0.26, 0.4, 0.06 * v)
        break
      case 'good':
        ;[523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 'triangle', t + i * 0.07, 0.25, 0.15 * v))
        break
      case 'wrong':
        this.tone(196, 'sawtooth', t, 0.35, 0.09 * v)
        this.tone(185, 'sawtooth', t + 0.02, 0.35, 0.09 * v)
        this.tone(130, 'sine', t + 0.12, 0.5, 0.18 * v)
        break
      case 'impact': {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.setValueAtTime(120, t)
        o.frequency.exponentialRampToValueAtTime(38, t + 0.5)
        this.env(g, t, 0.005, 0.6 * v, 0.7)
        o.connect(g)
        g.connect(this.master)
        o.start(t)
        o.stop(t + 0.8)
        const n = this.noise(0.4)
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = 900
        const g2 = ctx.createGain()
        this.env(g2, t, 0.002, 0.25 * v, 0.25)
        n.connect(f)
        f.connect(g2)
        g2.connect(this.master)
        this.tone(1760, 'sine', t + 0.05, 1.2, 0.04 * v)
        break
      }
      case 'xp':
        for (let i = 0; i < 6; i++) this.tone(900 + i * 140, 'sine', t + i * 0.045, 0.07, 0.07 * v)
        break
      case 'found':
        this.tone(880, 'triangle', t, 0.18, 0.18 * v)
        this.tone(1320, 'sine', t + 0.06, 0.25, 0.12 * v)
        break
      case 'miss':
        this.tone(240, 'triangle', t, 0.12, 0.12 * v)
        break
      case 'star':
        this.tone(1318.5, 'triangle', t, 0.3, 0.14 * v)
        this.tone(1975.5, 'sine', t + 0.04, 0.4, 0.08 * v)
        break
      case 'levelUp':
        ;[392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 'triangle', t + i * 0.08, 0.35, 0.15 * v))
        break
      case 'tick': {
        // indicator relay: a short filtered click with a woody body
        const n = this.noise(0.03)
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.value = 3200
        f.Q.value = 3
        const g = ctx.createGain()
        this.env(g, t, 0.001, 0.09 * v, 0.018)
        n.connect(f)
        f.connect(g)
        g.connect(this.master)
        this.tone(900, 'triangle', t, 0.02, 0.025 * v)
        break
      }
      case 'rewind': {
        // replay transition: tape-like descending sweep
        const n = this.noise(0.7)
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.Q.value = 6
        f.frequency.setValueAtTime(3600, t)
        f.frequency.exponentialRampToValueAtTime(300, t + 0.6)
        const g = ctx.createGain()
        this.env(g, t, 0.05, 0.12 * v, 0.6)
        n.connect(f)
        f.connect(g)
        g.connect(this.master)
        break
      }
      case 'horn': {
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = 1800
        f.connect(this.master)
        ;[415, 523].forEach((fr) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = 'square'
          o.frequency.value = fr
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.02)
          g.gain.setValueAtTime(0.09 * v, t + 0.45)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
          o.connect(g)
          g.connect(f)
          o.start(t)
          o.stop(t + 0.6)
        })
        break
      }
      case 'bell':
        ;[0, 0.16].forEach((dt) => {
          this.tone(2350, 'sine', t + dt, 0.5, 0.12 * v)
          this.tone(3520, 'sine', t + dt, 0.35, 0.06 * v)
          this.tone(4700, 'sine', t + dt, 0.2, 0.03 * v)
        })
        break
      case 'screech': {
        const n = this.noise(1.0)
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.Q.value = 9
        f.frequency.setValueAtTime(2600, t)
        f.frequency.linearRampToValueAtTime(1900, t + 0.8)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.05)
        g.gain.setValueAtTime(0.28 * v, t + 0.55)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95)
        n.connect(f)
        f.connect(g)
        g.connect(this.master)
        break
      }
      case 'whoosh': {
        const n = this.noise(0.6)
        const f = ctx.createBiquadFilter()
        f.type = 'bandpass'
        f.Q.value = 1.2
        f.frequency.setValueAtTime(400, t)
        f.frequency.exponentialRampToValueAtTime(2400, t + 0.25)
        f.frequency.exponentialRampToValueAtTime(600, t + 0.5)
        const g = ctx.createGain()
        this.env(g, t, 0.15, 0.16 * v, 0.35)
        n.connect(f)
        f.connect(g)
        g.connect(this.master)
        break
      }
      case 'ballBounce': {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.setValueAtTime(180, t)
        o.frequency.exponentialRampToValueAtTime(70, t + 0.12)
        this.env(g, t, 0.003, 0.3 * v, 0.14)
        o.connect(g)
        g.connect(this.master)
        o.start(t)
        o.stop(t + 0.2)
        break
      }
      case 'kidShout':
        break
    }
  }

  /* ───── continuous layers ───── */

  startEngine() {
    if (!this.ctx || !this.master || this.engine) return
    const ctx = this.ctx
    // a 4-cylinder idle is mostly low harmonics: sum soft partials, then a moving low-pass
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.value = 0
    const partials: OscillatorNode[] = []
    ;[1, 2, 3, 4.02].forEach((h, i) => {
      const o = ctx.createOscillator()
      o.type = i === 0 ? 'triangle' : 'sine'
      o.frequency.value = 30 * h
      const pg = ctx.createGain()
      pg.gain.value = [0.55, 0.32, 0.16, 0.07][i]
      o.connect(pg)
      pg.connect(filter)
      o.start()
      partials.push(o)
    })
    // cylinder-pulse amplitude modulation (subtle "chug")
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 15
    const lfoG = ctx.createGain()
    lfoG.gain.value = 0.15
    lfo.connect(lfoG)
    const am = ctx.createGain()
    am.gain.value = 0.85
    lfoG.connect(am.gain)
    filter.connect(am)
    am.connect(gain)
    gain.connect(this.master)
    lfo.start()
    // tyre / road noise: band-passed noise that rises in level and pitch with speed
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuf
    n.loop = true
    const tyreF = ctx.createBiquadFilter()
    tyreF.type = 'bandpass'
    tyreF.frequency.value = 350
    tyreF.Q.value = 0.6
    const tyre = ctx.createGain()
    tyre.gain.value = 0
    n.connect(tyreF)
    tyreF.connect(tyre)
    tyre.connect(this.master)
    // brake scrub under hard deceleration
    const n2 = ctx.createBufferSource()
    n2.buffer = this.noiseBuf
    n2.loop = true
    n2.playbackRate.value = 1.7
    const sf = ctx.createBiquadFilter()
    sf.type = 'bandpass'
    sf.frequency.value = 1600
    sf.Q.value = 2.5
    const scrub = ctx.createGain()
    scrub.gain.value = 0
    n2.connect(sf)
    sf.connect(scrub)
    scrub.connect(this.master)
    n.start()
    n2.start()
    this.engine = { partials, gain, filter, tyre, tyreF, scrub, lfo, srcs: [n, n2, lfo, ...partials] }
  }

  /** speed m/s, accel m/s², scale 0..1 (time scale, so slow-mo lowers pitch) */
  setEngine(speed: number, accel: number, scale = 1) {
    const e = this.engine
    if (!e || !this.ctx) return
    const t = this.ctx.currentTime
    // simple 3-gear model so revs rise and fall instead of a siren
    const gearTop = [4, 8.5, 13, 40]
    let gear = 0
    while (speed > gearTop[gear] && gear < gearTop.length - 1) gear++
    const lo = gear === 0 ? 0 : gearTop[gear - 1]
    const inGear = Math.min(1, (speed - lo) / (gearTop[gear] - lo))
    const load = Math.max(0, accel) / 3 // 0..1 when accelerating
    const rpm = 0.18 + inGear * 0.5 + load * 0.12
    const f = (26 + rpm * 46) * (0.6 + 0.4 * scale)
    e.partials.forEach((o, i) => o.frequency.setTargetAtTime(f * [1, 2, 3, 4.02][i], t, 0.12))
    e.lfo.frequency.setTargetAtTime(f / 2, t, 0.12)
    e.filter.frequency.setTargetAtTime(160 + rpm * 380 + load * 260, t, 0.15)
    // engine braking (decelerating) is quieter than pulling
    e.gain.gain.setTargetAtTime((0.045 + rpm * 0.04 + load * 0.03) * (accel < -0.3 ? 0.65 : 1), t, 0.15)
    e.tyre.gain.setTargetAtTime(Math.min(0.07, speed * 0.0055) * scale, t, 0.2)
    e.tyreF.frequency.setTargetAtTime(280 + speed * 45, t, 0.2)
    e.scrub.gain.setTargetAtTime(speed > 1.5 && accel < -4.5 ? Math.min(0.05, (-accel - 4.5) * 0.02) : 0, t, 0.08)
  }

  stopEngine() {
    const e = this.engine
    if (!e || !this.ctx) return
    const t = this.ctx.currentTime
    e.gain.gain.setTargetAtTime(0, t, 0.15)
    e.tyre.gain.setTargetAtTime(0, t, 0.15)
    e.scrub.gain.setTargetAtTime(0, t, 0.05)
    const eng = e
    setTimeout(() => {
      for (const s of eng.srcs)
        try {
          s.stop()
        } catch {
          /* ignore */
        }
    }, 800)
    this.engine = null
  }

  startAmbience() {
    if (!this.ctx || !this.master || this.ambience) return
    const ctx = this.ctx
    const bus = ctx.createGain()
    bus.gain.value = 0
    bus.gain.setTargetAtTime(1, ctx.currentTime, 1.2)
    bus.connect(this.master)
    this.ambience = bus
    const layer = (type: BiquadFilterType, freq: number, q: number, level: number, rate = 1, swell?: { hz: number; depth: number }) => {
      const n = ctx.createBufferSource()
      n.buffer = this.noiseBuf
      n.loop = true
      n.playbackRate.value = rate
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = freq
      f.Q.value = q
      const g = ctx.createGain()
      g.gain.value = level
      n.connect(f)
      f.connect(g)
      g.connect(bus)
      n.start()
      this.ambienceNodes.push(n)
      if (swell) {
        const l = ctx.createOscillator()
        l.frequency.value = swell.hz
        const lg = ctx.createGain()
        lg.gain.value = level * swell.depth
        l.connect(lg)
        lg.connect(g.gain)
        l.start()
        this.ambienceNodes.push(l)
      }
    }
    layer('lowpass', 160, 0.5, 0.05, 0.6, { hz: 0.07, depth: 0.6 }) // distant traffic rumble
    layer('bandpass', 420, 0.4, 0.022) // general outdoor air
    layer('highpass', 2600, 0.3, 0.008, 1.3, { hz: 0.13, depth: 0.9 }) // wind in leaves
    const bird = () => {
      if (!this.ctx || !this.ambience) return
      const t = this.ctx.currentTime
      const base = 2600 + Math.random() * 1600
      const count = 2 + Math.floor(Math.random() * 4)
      for (let i = 0; i < count; i++) {
        const o = this.ctx.createOscillator()
        const gg = this.ctx.createGain()
        const st = t + i * 0.11
        o.frequency.setValueAtTime(base, st)
        o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), st + 0.06)
        gg.gain.setValueAtTime(0.0001, st)
        gg.gain.exponentialRampToValueAtTime(0.014, st + 0.01)
        gg.gain.exponentialRampToValueAtTime(0.0001, st + 0.08)
        o.connect(gg)
        gg.connect(this.ambience)
        o.start(st)
        o.stop(st + 0.1)
      }
      this.birdTimer = window.setTimeout(bird, 3000 + Math.random() * 6000)
    }
    this.birdTimer = window.setTimeout(bird, 1500)
  }

  stopAmbience() {
    if (this.ambience && this.ctx) this.ambience.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
    this.ambience = null
    if (this.birdTimer) clearTimeout(this.birdTimer)
    const nodes = this.ambienceNodes
    this.ambienceNodes = []
    setTimeout(() => {
      for (const n of nodes)
        try {
          n.stop()
        } catch {
          /* ignore */
        }
    }, 1200)
  }
}

export const sfx = new Sfx()

export function haptic(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
