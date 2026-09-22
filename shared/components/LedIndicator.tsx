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
    <div className="flex flex-col items-center gap-1.5">
      <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
        <defs>
          <radialGradient id={`led-grad-${label}-${on}`} cx="35%" cy="35%">
            <stop offset="0%"   stopColor={on ? '#fef08a' : '#f1f5f9'} />
            <stop offset="50%"  stopColor={on ? '#fbbf24' : '#cbd5e1'} />
            <stop offset="100%" stopColor={on ? '#d97706' : '#94a3b8'} />
          </radialGradient>
          {on && (
            <filter id={`led-glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          )}
        </defs>

        {/* Glow halo when on */}
        {on && (
          <circle cx={cx} cy={cy} r={r + 8}
                  fill="#f59e0b35"
                  className="led-on"/>
        )}

        {/* Outer border ring for contrast on light bg */}
        <circle
          cx={cx} cy={cy} r={r + 1}
          fill="none"
          stroke={on ? '#f59e0b' : '#cbd5e1'}
          strokeWidth="1"
        />

        {/* LED body */}
        <circle
          cx={cx} cy={cy} r={r}
          fill={`url(#led-grad-${label}-${on})`}
          stroke={on ? '#d97706' : '#94a3b8'}
          strokeWidth="1.5"
          filter={on ? `url(#led-glow-${label})` : undefined}
          className={on ? 'led-on' : ''}
        />

        {/* Lens reflection */}
        <ellipse cx={cx - r * 0.25} cy={cy - r * 0.3} rx={r * 0.2} ry={r * 0.12}
                 fill="white" opacity={on ? 0.6 : 0.4}/>

        {/* Flat bottom collar of LED */}
        <rect x={cx - r * 0.15} y={cy + r - 2} width={r * 0.3} height={5}
              fill={on ? '#b45309' : '#64748b'} rx="1"/>
      </svg>

      <div className="text-center">
        {label && (
          <div className={`text-xs font-mono font-bold ${on ? 'text-amber-700' : 'text-slate-700'}`}>
            {label}
          </div>
        )}
        <div className={`text-[11px] font-mono font-semibold ${on ? 'text-amber-600' : 'text-slate-400'}`}>
          {on ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  )
}

export default LedIndicator
