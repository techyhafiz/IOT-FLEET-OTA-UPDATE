import React, { useEffect, useRef } from 'react'
import '@wokwi/elements'

interface Props {
  pins?: Partial<{ D0: 0 | 1; D1: 0 | 1; D2: 0 | 1; D3: 0 | 1; D4: 0 | 1; D5: 0 | 1 }>
  size?: 'sm' | 'md' | 'lg'
  isUpdating?: boolean
  isOffline?: boolean
  template?: 'led' | 'lcd'
}

const SCALE: Record<'sm' | 'md' | 'lg', number> = {
  sm: 0.72,
  md: 1.05,
  lg: 1.35,
}

const WokwiEsp32 = 'wokwi-esp32-devkit-v1' as any

export const Esp32Board: React.FC<Props> = ({
  pins = {},
  size = 'md',
  isUpdating = false,
  isOffline = false,
}) => {
  const elRef = useRef<any>(null)
  const scale = SCALE[size]
  const width = Math.round(107 * scale)
  const height = Math.round(204 * scale)

  useEffect(() => {
    if (elRef.current) {
      elRef.current.ledPower = !isOffline
      elRef.current.led1 = isUpdating || pins.D0 === 1 || pins.D2 === 1
    }
  }, [isOffline, isUpdating, pins])

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 ${
        isOffline ? 'opacity-40 grayscale' : ''
      } ${isUpdating ? 'animate-pulse' : ''}`}
      style={{ width: width + 24, height: height + 24 }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: 107,
          height: 204,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WokwiEsp32
          ref={elRef}
          ledpower={!isOffline ? 'true' : 'false'}
          led1={isUpdating ? 'true' : 'false'}
        />
      </div>

      {/* Dynamic pin badges for active GPIO */}
      {(pins.D0 === 1 || pins.D1 === 1) && (
        <div className="flex gap-1.5 justify-center mt-1">
          {pins.D0 === 1 && (
            <span className="text-[9px] font-mono font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-xs">
              D0:HIGH
            </span>
          )}
          {pins.D1 === 1 && (
            <span className="text-[9px] font-mono font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded shadow-xs">
              D1:HIGH
            </span>
          )}
        </div>
      )}
    </div>
  )
}
