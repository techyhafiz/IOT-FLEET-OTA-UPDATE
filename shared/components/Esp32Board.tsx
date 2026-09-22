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

const PIN_COLOR = (active: boolean) => active ? '#0891b2' : '#94a3b8'
const PIN_GLOW  = (active: boolean) => active ? 'drop-shadow(0 0 3px #06b6d4)' : 'none'

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
    isOffline   ? 'opacity-40 grayscale' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`inline-block ${boardClass}`} style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 200 270`} xmlns="http://www.w3.org/2000/svg">
        {/* PCB board body */}
        <rect x="20" y="10" width="160" height="250" rx="6" ry="6"
              fill="#143e2b" stroke="#166534" strokeWidth="2"/>
        {/* Board silkscreen label */}
        <text x="100" y="30" textAnchor="middle" fill="#86efac" fontSize="9" fontFamily="monospace" fontWeight="bold">
          ESP32-WROOM-32
        </text>

        {/* Antenna (top right) */}
        <rect x="148" y="12" width="28" height="36" rx="2" fill="#166534" stroke="#86efac" strokeWidth="1"/>
        <text x="162" y="34" textAnchor="middle" fill="#86efac" fontSize="7" fontFamily="monospace" fontWeight="bold">ANT</text>

        {/* Main ESP32 chip */}
        <rect x="55" y="50" width="90" height="70" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5"/>
        <text x="100" y="82" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">ESP32</text>
        <text x="100" y="94" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">Xtensa LX6</text>
        {/* Chip solder balls */}
        {[0,1,2,3,4,5].map(i => (
          <circle key={i} cx={65 + i * 14} cy={58} r="2" fill="#475569"/>
        ))}
        {[0,1,2,3,4,5].map(i => (
          <circle key={i} cx={65 + i * 14} cy={113} r="2" fill="#475569"/>
        ))}

        {/* USB connector */}
        <rect x="80" y="238" width="40" height="18" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1"/>
        <rect x="88" y="242" width="24" height="10" rx="1" fill="#475569"/>
        <text x="100" y="252" textAnchor="middle" fill="#1e293b" fontSize="6" fontFamily="monospace" fontWeight="bold">USB</text>

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
              <line x1="32" y1={y} x2="55" y2={y} stroke={isActive ? '#06b6d480' : '#1e3a2f'} strokeWidth="1"/>
              {/* Pin label */}
              <text x="18" y={y + 3} textAnchor="end" fill={isActive ? '#0891b2' : '#64748b'}
                    fontSize="6" fontFamily="monospace" fontWeight={isActive ? 'bold' : 'normal'}>{pin}</text>
            </g>
          )
        })}

        {/* Right pin row */}
        {['3V3','GND','D4','D5','D6','D7','A0','EN'].map((pin, i) => {
          const y = 140 + i * 12
          return (
            <g key={pin}>
              <rect x="168" y={y - 4} width="10" height="8" rx="1" fill="#94a3b8"/>
              <line x1="145" y1={y} x2="168" y2={y} stroke="#1e3a2f" strokeWidth="1"/>
              <text x="182" y={y + 3} textAnchor="start" fill="#64748b"
                    fontSize="6" fontFamily="monospace">{pin}</text>
            </g>
          )
        })}

        {/* Template icon area */}
        {template === 'lcd' && (
          <g>
            <rect x="65" y="130" width="70" height="30" rx="3" fill="#064e3b" stroke="#059669" strokeWidth="1"/>
            <text x="100" y="145" textAnchor="middle" fill="#fef08a" fontSize="7" fontFamily="monospace" fontWeight="bold">I2C LCD</text>
            <text x="100" y="155" textAnchor="middle" fill="#6ee7b7" fontSize="5" fontFamily="monospace">0x27</text>
          </g>
        )}
        {template === 'led' && (
          <g>
            {/* LED 1 */}
            <circle cx="78" cy="148" r="8" fill={pins.D0 ? '#fbbf24' : '#1e293b'}
                    stroke={pins.D0 ? '#f59e0b' : '#475569'} strokeWidth="1.5"/>
            <text x="78" y="151" textAnchor="middle" fill={pins.D0 ? '#1e293b' : '#94a3b8'}
                  fontSize="5" fontFamily="monospace" fontWeight="bold">L1</text>
            {/* LED 2 */}
            <circle cx="100" cy="148" r="8" fill={pins.D1 ? '#fbbf24' : '#1e293b'}
                    stroke={pins.D1 ? '#f59e0b' : '#475569'} strokeWidth="1.5"/>
            <text x="100" y="151" textAnchor="middle" fill={pins.D1 ? '#1e293b' : '#94a3b8'}
                  fontSize="5" fontFamily="monospace" fontWeight="bold">L2</text>
          </g>
        )}

        {/* Offline overlay */}
        {isOffline && (
          <g>
            <rect x="20" y="10" width="160" height="250" rx="6" fill="#0f172acc"/>
            <text x="100" y="135" textAnchor="middle" fill="#f87171" fontSize="11"
                  fontFamily="monospace" fontWeight="bold">POWERED</text>
            <text x="100" y="150" textAnchor="middle" fill="#f87171" fontSize="11"
                  fontFamily="monospace" fontWeight="bold">OFF</text>
          </g>
        )}

        {/* Updating overlay */}
        {isUpdating && (
          <g>
            <rect x="20" y="10" width="160" height="250" rx="6" fill="#0891b233"/>
            <text x="100" y="135" textAnchor="middle" fill="#06b6d4" fontSize="9"
                  fontFamily="monospace" fontWeight="bold">UPDATING</text>
            <text x="100" y="148" textAnchor="middle" fill="#06b6d4" fontSize="8"
                  fontFamily="monospace">FIRMWARE...</text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default Esp32Board
