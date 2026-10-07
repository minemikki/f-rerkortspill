/** Minimal custom icon set (stroke-based, 24px grid). */
type P = { className?: string; size?: number }

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconClose = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconArrow = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const IconBack = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)
export const IconLock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
export const IconSound = ({ className, size, muted }: P & { muted?: boolean }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 10v4h3l5 4V6L7 10H4z" />
    {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" />}
  </svg>
)
export const IconRetry = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
  </svg>
)
export const IconPlay = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
  </svg>
)
export const IconCheck = ({ className, size }: P) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
export const IconEye = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
export const IconBolt = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)
export const IconShield = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
  </svg>
)
export const IconSigns = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l9 16H3L12 3z" />
  </svg>
)

export function Flame({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M12 2c1 4 6 6 6 12a6 6 0 11-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="#ff7a2f" />
      <path d="M12 12c.6 2 3 3 3 5.5a3 3 0 11-6 0c0-1.4.8-2.4 1.5-3 0 1 .6 1.5 1 1.5 0-1.5-.2-2.6.5-4z" fill="#ffd400" />
    </svg>
  )
}

export function Star({ filled, size = 18, className }: P & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2.8l2.7 5.7 6.2.8-4.6 4.3 1.2 6.2L12 16.8 6.5 19.8l1.2-6.2L3.1 9.3l6.2-.8L12 2.8z"
        fill={filled ? '#ffd400' : 'rgba(255,255,255,0.12)'}
        stroke={filled ? '#c9a300' : 'rgba(255,255,255,0.18)'}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <svg width="26" height="26" viewBox="0 0 512 512" aria-hidden>
        <path d="M150 400 L230 112 L282 112 L362 400 Z" fill="currentColor" opacity="0.18" />
        <rect x="244" y="140" width="24" height="50" rx="5" fill="#ffd400" />
        <rect x="244" y="226" width="24" height="62" rx="5" fill="#ffd400" />
        <rect x="244" y="322" width="24" height="76" rx="5" fill="#ffd400" />
      </svg>
      <span className="display text-[22px] tracking-[-0.01em]">KJØR</span>
    </div>
  )
}
