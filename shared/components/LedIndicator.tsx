import React from 'react'

interface Props {
  on: boolean
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm:  { r: 16, total: 40 },
  md:  { r: 28, total: 70 },
  lg:  { r: 40, total: 96 },
}

export const LedIndicator: React.FC<Props> = ({ on, label, size = 'md' }) => {
  const { r, total } = SIZES[size]
  const cx = total / 2
  const cy = total / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
        <defs>
          <radialGradient id={`led-grad-${label}-${on}`} cx="35%" cy="35%">
            <stop offset="0%"   stopColor={on ? '#fef08a' : '#4b5563'} />
            <stop offset="60%"  stopColor={on ? '#fbbf24' : '#374151'} />
            <stop offset="100%" stopColor={on ? '#b45309' : '#1f2937'} />
          </radialGradient>
          {on && (
            <filter id={`led-glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          )}
        </defs>

        {/* Glow halo when on */}
        {on && (
          <circle cx={cx} cy={cy} r={r + 6}
                  fill="#fbbf2430"
                  className="led-on"/>
        )}

        {/* LED body */}
        <circle
          cx={cx} cy={cy} r={r}
          fill={`url(#led-grad-${label}-${on})`}
          stroke={on ? '#f59e0b' : '#374151'}
          strokeWidth="1.5"
          filter={on ? `url(#led-glow-${label})` : undefined}
          className={on ? 'led-on' : ''}
        />

        {/* Lens reflection */}
        {on && (
          <ellipse cx={cx - r * 0.25} cy={cy - r * 0.3} rx={r * 0.2} ry={r * 0.12}
                   fill="white" opacity="0.4"/>
        )}

        {/* Flat bottom of LED (realistic shape) */}
        <rect x={cx - r * 0.15} y={cy + r - 2} width={r * 0.3} height={6}
              fill={on ? '#92400e' : '#1f2937'} rx="1"/>
      </svg>

      <div className="text-center">
        <div className={`text-xs font-mono font-bold ${on ? 'text-amber-400' : 'text-slate-500'}`}>
          {label}
        </div>
        <div className={`text-xs font-mono ${on ? 'text-amber-300' : 'text-slate-600'}`}>
          {on ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  )
}

export default LedIndicator
