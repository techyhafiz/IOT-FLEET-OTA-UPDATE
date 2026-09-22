import React, { useEffect, useRef } from 'react'
import '@wokwi/elements'

interface Props {
  row1: string
  row2: string
  backlight?: boolean
  size?: 'sm' | 'md'
}

const SCALE: Record<'sm' | 'md', number> = {
  sm: 0.85,
  md: 1.15,
}

const WokwiLcd = 'wokwi-lcd1602' as any

export const LcdScreen: React.FC<Props> = ({
  row1,
  row2,
  backlight = true,
  size = 'md',
}) => {
  const elRef = useRef<any>(null)
  const scale = SCALE[size]
  const fullText = `${(row1 || '').slice(0, 16).padEnd(16, ' ')}\n${(row2 || '').slice(0, 16).padEnd(16, ' ')}`

  useEffect(() => {
    if (elRef.current) {
      elRef.current.text = fullText
      elRef.current.backlight = backlight
    }
  }, [fullText, backlight])

  return (
    <div className="inline-flex flex-col items-center p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WokwiLcd
          ref={elRef}
          text={fullText}
          backlight={backlight ? 'true' : 'false'}
          pins="false"
        />
      </div>
      <div className="flex justify-between w-full px-2 mt-1 text-[10px] font-mono text-slate-400">
        <span>HD44780 (0x27)</span>
        <span className="text-emerald-600 font-semibold">I2C BUS READY</span>
      </div>
    </div>
  )
}
