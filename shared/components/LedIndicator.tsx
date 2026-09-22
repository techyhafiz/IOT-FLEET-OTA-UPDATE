import React, { useEffect, useRef } from 'react'
import '@wokwi/elements'

interface Props {
  on: boolean
  label: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const SCALE: Record<'sm' | 'md' | 'lg', number> = {
  sm: 0.85,
  md: 1.15,
  lg: 1.5,
}

const WokwiLed = 'wokwi-led' as any

export const LedIndicator: React.FC<Props> = ({ on, label, size = 'md', color = 'orange' }) => {
  const elRef = useRef<any>(null)
  const scale = SCALE[size]

  useEffect(() => {
    if (elRef.current) {
      elRef.current.value = on
    }
  }, [on])

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: on ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.75))' : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        <WokwiLed
          ref={elRef}
          color={color}
          value={on ? 'true' : 'false'}
        />
      </div>
      <span className={`text-xs font-mono font-bold tracking-wider transition-colors ${
        on ? 'text-amber-700 font-extrabold' : 'text-slate-500'
      }`}>
        {label}
      </span>
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
        on ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'
      }`}>
        {on ? 'HIGH (1)' : 'LOW (0)'}
      </span>
    </div>
  )
}
