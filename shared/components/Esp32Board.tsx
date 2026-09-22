import React from 'react'

interface Props {
  pins?: Partial<{ D0: 0 | 1; D1: 0 | 1; D2: 0 | 1; D3: 0 | 1; D4: 0 | 1; D5: 0 | 1 }>
  size?: 'sm' | 'md' | 'lg'
  isUpdating?: boolean
  isOffline?: boolean
  template?: 'led' | 'lcd'
}

const SIZES = {
  sm: { w: 120, h: 160, scale: 0.6 },
  md: { w: 200, h: 270, scale: 1 },
  lg: { w: 260, h: 350, scale: 1.3 },
}

const PIN_COLOR = (active: boolean) => active ? '#22d3ee' : '#475569'
const PIN_GLOW  = (active: boolean) => active ? 'drop-shadow(0 0 3px #22d3ee)' : 'none'

export const Esp32Board: React.FC<Props> = ({
  pins = {},
  size = 'md',
  isUpdating = false,
  isOffline = false,
  template = 'led',
}) => {
  const { w, h } = SIZES[size]
  const pinList = ['3V3', 'GND', 'D0', 'D1', 'D2', 'D3', 'TX', 'RX']

  const boardClass = [
    isUpdating ? 'board-flicker' : '',
    isOffline   ? 'opacity-30 grayscale' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`inline-block ${boardClass}`} style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 200 270`} xmlns="http://www.w3.org/2000/svg">
        {/* PCB board body */}
        <rect x="20" y="10" width="160" height="250" rx="6" ry="6"
              fill="#1a3a2a" stroke="#2d6a4f" strokeWidth="2"/>
        {/* Board silkscreen label */}
        <text x="100" y="30" textAnchor="middle" fill="#4ade80" fontSize="9" fontFamily="monospace">
          ESP32-WROOM-32
        </text>

        {/* Antenna (top right) */}
        <rect x="148" y="12" width="28" height="36" rx="2" fill="#2d6a4f" stroke="#4ade80" strokeWidth="1"/>
        <text x="162" y="34" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="monospace">ANT</text>

        {/* Main ESP32 chip */}
        <rect x="55" y="50" width="90" height="70" rx="4" fill="#111827" stroke="#374151" strokeWidth="1.5"/>
        <text x="100" y="82" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="monospace">ESP32</text>
        <text x="100" y="94" textAnchor="middle" fill="#4b5563" fontSize="6" fontFamily="monospace">Xtensa LX6</text>
        {/* Chip dots */}
        {[0,1,2,3,4,5].map(i => (
          <circle key={i} cx={65 + i * 14} cy={58} r="2" fill="#374151"/>
        ))}
        {[0,1,2,3,4,5].map(i => (
          <circle key={i} cx={65 + i * 14} cy={113} r="2" fill="#374151"/>
        ))}

        {/* USB connector */}
        <rect x="80" y="238" width="40" height="18" rx="3" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
        <rect x="88" y="242" width="24" height="10" rx="1" fill="#1f2937"/>
        <text x="100" y="252" textAnchor="middle" fill="#6b7280" fontSize="6" fontFamily="monospace">USB</text>

        {/* Left pin row */}
        {pinList.map((pin, i) => {
          const y = 140 + i * 12
          const isActive = (pin === 'D0' && pins.D0 === 1) ||
                           (pin === 'D1' && pins.D1 === 1) ||
                           (pin === 'D2' && pins.D2 === 1) ||
                           (pin === 'D3' && pins.D3 === 1)
          return (
            <g key={pin}>
              {/* Pin pad */}
              <rect x="22" y={y - 4} width="10" height="8" rx="1"
                    fill={PIN_COLOR(isActive)}
                    style={{ filter: PIN_GLOW(isActive) }}/>
              {/* Trace line to board edge */}
              <line x1="32" y1={y} x2="55" y2={y} stroke={isActive ? '#22d3ee44' : '#1f2937'} strokeWidth="1"/>
              {/* Pin label */}
              <text x="18" y={y + 3} textAnchor="end" fill={isActive ? '#22d3ee' : '#6b7280'}
                    fontSize="6" fontFamily="monospace">{pin}</text>
            </g>
          )
        })}

        {/* Right pin row */}
        {['3V3','GND','D4','D5','D6','D7','A0','EN'].map((pin, i) => {
          const y = 140 + i * 12
          return (
            <g key={pin}>
              <rect x="168" y={y - 4} width="10" height="8" rx="1" fill="#334155"/>
              <line x1="145" y1={y} x2="168" y2={y} stroke="#1f2937" strokeWidth="1"/>
              <text x="182" y={y + 3} textAnchor="start" fill="#4b5563"
                    fontSize="6" fontFamily="monospace">{pin}</text>
            </g>
          )
        })}

        {/* Template icon area */}
        {template === 'lcd' && (
          <g>
            <rect x="65" y="130" width="70" height="30" rx="3" fill="#0a2e0a" stroke="#166534" strokeWidth="1"/>
            <text x="100" y="145" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace">I2C LCD</text>
            <text x="100" y="155" textAnchor="middle" fill="#4ade80" fontSize="5" fontFamily="monospace">0x27</text>
          </g>
        )}
        {template === 'led' && (
          <g>
            {/* LED 1 */}
            <circle cx="78" cy="148" r="8" fill={pins.D0 ? '#fbbf24' : '#1f2937'}
                    stroke={pins.D0 ? '#f59e0b' : '#374151'} strokeWidth="1.5"/>
            <text x="78" y="151" textAnchor="middle" fill={pins.D0 ? '#1f2937' : '#6b7280'}
                  fontSize="5" fontFamily="monospace">L1</text>
            {/* LED 2 */}
            <circle cx="100" cy="148" r="8" fill={pins.D1 ? '#fbbf24' : '#1f2937'}
                    stroke={pins.D1 ? '#f59e0b' : '#374151'} strokeWidth="1.5"/>
            <text x="100" y="151" textAnchor="middle" fill={pins.D1 ? '#1f2937' : '#6b7280'}
                  fontSize="5" fontFamily="monospace">L2</text>
          </g>
        )}

        {/* Offline overlay */}
        {isOffline && (
          <g>
            <rect x="20" y="10" width="160" height="250" rx="6" fill="#00000088"/>
            <text x="100" y="135" textAnchor="middle" fill="#ef4444" fontSize="11"
                  fontFamily="monospace" fontWeight="bold">POWERED</text>
            <text x="100" y="150" textAnchor="middle" fill="#ef4444" fontSize="11"
                  fontFamily="monospace" fontWeight="bold">OFF</text>
          </g>
        )}

        {/* Updating overlay */}
        {isUpdating && (
          <g>
            <rect x="20" y="10" width="160" height="250" rx="6" fill="#06b6d422"/>
            <text x="100" y="135" textAnchor="middle" fill="#22d3ee" fontSize="9"
                  fontFamily="monospace" fontWeight="bold">UPDATING</text>
            <text x="100" y="148" textAnchor="middle" fill="#22d3ee" fontSize="8"
                  fontFamily="monospace">FIRMWARE...</text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default Esp32Board
