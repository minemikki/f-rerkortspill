import type { DiagramId, SceneRef, SignId } from '../../learning/types'

/**
 * Teaching visuals as inline SVG: top-down situation diagrams and
 * Norwegian road signs. Tiny, crisp at any size, no assets to load.
 * Colours: you = signal yellow, other road users = blue/white, danger = red.
 */

const ROAD = '#2a3039'
const EDGE = '#3a424d'
const YOU = '#ffd400'
const OTHER = '#8fd3ff'
const PED = '#ff8a5c'

function Car({ x, y, rot, color, label }: { x: number; y: number; rot: number; color: string; label?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-7} y={-12} width={14} height={24} rx={4} fill={color} />
      <rect x={-5} y={-6} width={10} height={6} rx={1.5} fill="#0a0e13" opacity={0.55} />
      {label && (
        <text y={22} textAnchor="middle" fontSize={9} fontWeight={800} fill={color} transform={`rotate(${-rot})`}>
          {label}
        </text>
      )}
    </g>
  )
}

function Arrow({ d, color, dashed }: { d: string; color: string; dashed?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={dashed ? '5 5' : undefined} markerEnd={`url(#ah-${color.slice(1)})`} />
    </g>
  )
}

function Defs() {
  return (
    <defs>
      {[YOU, OTHER, PED, '#ff4a3d', '#2ee6a6'].map((c) => (
        <marker key={c} id={`ah-${c.slice(1)}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={c} />
        </marker>
      ))}
    </defs>
  )
}

function Crossroads({ hedge }: { hedge?: 'br' | 'bl' }) {
  return (
    <g>
      <rect x={75} y={0} width={50} height={200} fill={ROAD} />
      <rect x={0} y={75} width={200} height={50} fill={ROAD} />
      <path d="M75 0V75H0M125 0V75H200M75 200V125H0M125 200V125H200" fill="none" stroke={EDGE} strokeWidth={2} />
      {hedge === 'br' && <rect x={131} y={131} width={44} height={10} rx={5} fill="#3f6b3a" />}
      {hedge === 'br' && <rect x={131} y={131} width={10} height={44} rx={5} fill="#3f6b3a" />}
    </g>
  )
}

function DiagramSvg({ id, mirror }: { id: DiagramId; mirror?: boolean }) {
  const body = (() => {
    switch (id) {
      case 'kryss-hoyre':
        return (
          <>
            <Crossroads hedge="br" />
            <Car x={112} y={165} rot={0} color={YOU} label="DEG" />
            <Arrow d="M112 145 V128" color={YOU} dashed />
            <Car x={172} y={88} rot={-90} color={OTHER} />
            <Arrow d="M152 88 H110" color={OTHER} />
            <text x={150} y={70} fontSize={10} fontWeight={800} fill={OTHER} textAnchor="middle">
              KJØRER FØRST
            </text>
          </>
        )
      case 'kryss-venstre':
        return (
          <>
            <Crossroads />
            <Car x={112} y={165} rot={0} color={YOU} label="DEG" />
            <Arrow d="M112 145 V95" color={YOU} />
            <Car x={28} y={112} rot={90} color={OTHER} />
            <Arrow d="M45 112 H62" color={OTHER} dashed />
            <text x={40} y={145} fontSize={10} fontWeight={800} fill={OTHER} textAnchor="middle">
              VIKER
            </text>
          </>
        )
      case 'kryss-forkjorsvei':
        return (
          <>
            <Crossroads />
            <rect x={75} y={0} width={50} height={200} fill="none" stroke={YOU} strokeWidth={2} strokeDasharray="2 6" />
            <Car x={112} y={165} rot={0} color={YOU} label="DEG" />
            <Arrow d="M112 145 V60" color={YOU} />
            <Car x={172} y={88} rot={-90} color={OTHER} />
          </>
        )
      case 'gangfelt-fotgjenger':
        return (
          <>
            <rect x={60} y={0} width={80} height={200} fill={ROAD} />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <rect key={i} x={64 + i * 11} y={70} width={6} height={30} fill="#f4f1ea" opacity={0.9} />
            ))}
            <circle cx={95} cy={85} r={7} fill={PED} />
            <Arrow d="M88 85 H66" color={PED} />
            <Car x={115} y={160} rot={0} color={YOU} label="DEG" />
            <path d="M100 118 H130" stroke="#ff4a3d" strokeWidth={3} />
          </>
        )
      case 'sykkelfelt-hoyresving':
        return (
          <>
            <rect x={50} y={0} width={70} height={200} fill={ROAD} />
            <rect x={120} y={0} width={16} height={200} fill="#8f3a32" />
            <rect x={136} y={70} width={64} height={50} fill={ROAD} />
            <rect x={120} y={70} width={16} height={50} fill="#8f3a32" opacity={0.55} />
            <Car x={102} y={140} rot={0} color={YOU} label="DEG" />
            <Arrow d="M102 122 Q102 95 150 95" color={YOU} dashed />
            <circle cx={128} cy={175} r={6} fill={OTHER} />
            <Arrow d="M128 165 V60" color={OTHER} />
          </>
        )
      case 'rundkjoring-utkjoring':
        return (
          <>
            <rect x={80} y={0} width={40} height={200} fill={ROAD} />
            <rect x={0} y={80} width={200} height={40} fill={ROAD} />
            <circle cx={100} cy={100} r={52} fill={ROAD} />
            <circle cx={100} cy={100} r={22} fill="#3f6b3a" />
            <Car x={62} y={100} rot={180} color={YOU} label="DEG" />
            <Arrow d="M62 80 Q70 55 100 50 Q125 48 140 60 L160 90 H190" color={YOU} dashed />
            <circle cx={70} cy={88} r={4} fill="#ffa020" />
          </>
        )
      case 'ball-barn':
        return (
          <>
            <rect x={55} y={0} width={90} height={200} fill={ROAD} />
            <Car x={68} y={60} rot={0} color="#9aa5b1" />
            <Car x={68} y={115} rot={0} color="#9aa5b1" />
            <circle cx={88} cy={88} r={5} fill="#ff4a3d" />
            <Arrow d="M80 88 H96" color="#ff4a3d" dashed />
            <circle cx={40} cy={88} r={7} fill={PED} />
            <Arrow d="M48 88 H62" color={PED} dashed />
            <Car x={120} y={165} rot={0} color={YOU} label="DEG" />
          </>
        )
      case 'avkjorsel':
        return (
          <>
            <rect x={0} y={60} width={200} height={50} fill={ROAD} />
            <rect x={70} y={110} width={50} height={90} fill="#3a424d" />
            <Car x={95} y={160} rot={0} color={YOU} label="DEG" />
            <Arrow d="M95 140 V122" color={YOU} dashed />
            <Car x={30} y={97} rot={90} color={OTHER} />
            <Car x={170} y={73} rot={-90} color={OTHER} />
            <text x={150} y={150} fontSize={10} fontWeight={800} fill={YOU}>
              VIK FOR ALLE
            </text>
          </>
        )
    }
  })()
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`Situasjonsskisse: ${id}`}>
      <Defs />
      <rect width={200} height={200} rx={18} fill="#161c24" />
      <g transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>{body}</g>
    </svg>
  )
}

export function SignSvg({ sign }: { sign: SignId }) {
  const s = (() => {
    switch (sign) {
      case 'vikeplikt':
        return (
          <>
            <path d="M10 18 H90 L50 88 Z" fill="#fff" stroke="#d1121a" strokeWidth={9} strokeLinejoin="round" />
          </>
        )
      case 'stopp':
        return (
          <>
            <path d="M30 6 H70 L94 30 V70 L70 94 H30 L6 70 V30 Z" fill="#d1121a" stroke="#fff" strokeWidth={3} />
            <text x={50} y={60} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff">
              STOP
            </text>
          </>
        )
      case 'forkjorsvei':
        return (
          <>
            <path d="M50 4 L96 50 L50 96 L4 50 Z" fill="#fff" stroke="#222" strokeWidth={1.5} />
            <path d="M50 18 L82 50 L50 82 L18 50 Z" fill="#ffc20e" />
          </>
        )
      case 'forkjorsvei-slutt':
        return (
          <>
            <path d="M50 4 L96 50 L50 96 L4 50 Z" fill="#fff" stroke="#222" strokeWidth={1.5} />
            <path d="M50 18 L82 50 L50 82 L18 50 Z" fill="#ffc20e" />
            <path d="M24 76 L76 24" stroke="#222" strokeWidth={6} />
          </>
        )
      case 'gangfelt':
        return (
          <>
            <rect x={6} y={6} width={88} height={88} rx={8} fill="#1d5aa8" />
            <path d="M50 16 L86 82 H14 Z" fill="#fff" />
            <circle cx={50} cy={42} r={5} fill="#111" />
            <path d="M50 48 L46 62 L40 74 M48 60 L56 74 M44 54 L56 52" stroke="#111" strokeWidth={4} strokeLinecap="round" fill="none" />
            <path d="M28 78 H72" stroke="#111" strokeWidth={3} strokeDasharray="5 3" />
          </>
        )
      case 'fart30':
        return (
          <>
            <circle cx={50} cy={50} r={44} fill="#fff" stroke="#d1121a" strokeWidth={9} />
            <text x={50} y={63} textAnchor="middle" fontSize={36} fontWeight={800} fill="#111">
              30
            </text>
          </>
        )
      case 'rundkjoring':
        return (
          <>
            <circle cx={50} cy={50} r={44} fill="#1d5aa8" />
            {[0, 120, 240].map((a) => (
              <path key={a} d="M50 20 A30 30 0 0 1 76 35" stroke="#fff" strokeWidth={7} fill="none" transform={`rotate(${a} 50 50)`} />
            ))}
          </>
        )
      case 'boligomrade':
      case 'barn':
        return (
          <>
            <path d="M50 8 L94 86 H6 Z" fill="#fff" stroke="#d1121a" strokeWidth={8} strokeLinejoin="round" />
            <circle cx={44} cy={44} r={5} fill="#111" />
            <circle cx={60} cy={50} r={4} fill="#111" />
          </>
        )
    }
  })()
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={`Skilt: ${sign}`}>
      {s}
    </svg>
  )
}

export function SceneVisual({ scene, className = '' }: { scene: SceneRef; className?: string }) {
  if (scene.kind === 'sign')
    return (
      <div className={`grid place-items-center rounded-2xl bg-[#161c24] p-5 ${className}`}>
        <div className="h-24 w-24">
          <SignSvg sign={scene.sign} />
        </div>
      </div>
    )
  if (scene.kind === 'diagram')
    return (
      <div className={className}>
        <DiagramSvg id={scene.diagram} mirror={scene.mirror} />
      </div>
    )
  // linked 3D scene: show the matching diagram until frame capture lands (see docs)
  const fallback: Record<string, DiagramId> = {
    's1-hoyreregel': 'kryss-hoyre',
    's2-ballen': 'ball-barn',
    's3-syklisten': 'sykkelfelt-hoyresving',
    's4-gangfelt': 'gangfelt-fotgjenger',
    's5-rushtrafikk': 'rundkjoring-utkjoring',
  }
  return (
    <div className={`relative ${className}`}>
      <DiagramSvg id={fallback[scene.scenarioId] ?? 'kryss-hoyre'} />
      <span className="eyebrow absolute left-3 top-3 rounded-full bg-ink/70 px-2 py-1 text-[9px] text-signal">Fra scenarioet</span>
    </div>
  )
}

export { DiagramSvg }
