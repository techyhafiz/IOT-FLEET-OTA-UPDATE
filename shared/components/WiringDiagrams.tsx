import React from 'react'

export type Pin = 'D0' | 'D1' | 'D2' | 'D3'

const PIN_META: Record<Pin, { num: number; y: number; color: string; off: string }> = {
  D0: { num: 16, y: 96, color: '#f59e0b', off: '#94a3b8' },
  D1: { num: 17, y: 146, color: '#0ea5e9', off: '#94a3b8' },
  D2: { num: 18, y: 196, color: '#8b5cf6', off: '#94a3b8' },
  D3: { num: 19, y: 246, color: '#10b981', off: '#94a3b8' },
}

const ALL_PINS: Pin[] = ['D0', 'D1', 'D2', 'D3']

/** Small schematic ESP32 module with labelled header pins. */
function Esp32Module({ pins, x = 24, y = 40 }: { pins: { label: string; sub: string; y: number }[]; x?: number; y?: number }) {
  const h = 250
  return (
    <g>
      <rect x={x} y={y} width={150} height={h} rx={10} fill="#1e293b" />
      <rect x={x} y={y} width={150} height={h} rx={10} fill="none" stroke="#0f172a" strokeWidth={2} />
      {/* antenna / chip */}
      <rect x={x + 12} y={y + 10} width={126} height={26} rx={4} fill="#334155" />
      <text x={x + 75} y={y + 28} textAnchor="middle" fontSize={11} fill="#94a3b8" fontFamily="monospace">ESP32-WROOM</text>
      <text x={x + 75} y={y + 52} textAnchor="middle" fontSize={12} fill="#e2e8f0" fontFamily="monospace" fontWeight="bold">ESP32 DevKit</text>
      {/* header pins */}
      {pins.map(p => (
        <g key={p.label}>
          <rect x={x + 142} y={p.y - 6} width={16} height={12} rx={2} fill="#facc15" stroke="#a16207" strokeWidth={1} />
          <text x={x + 136} y={p.y + 4} textAnchor="end" fontSize={10} fill="#e2e8f0" fontFamily="monospace">{p.label}</text>
          <text x={x + 136} y={p.y + 14} textAnchor="end" fontSize={8} fill="#64748b" fontFamily="monospace">{p.sub}</text>
        </g>
      ))}
    </g>
  )
}

interface LedWiringProps {
  /** Live pin states: 1 = HIGH, 0 = LOW */
  gpio: { D0: number; D1: number; D2: number; D3: number }
  /** Which pins actually have an LED wired (defaults to all four) */
  wiredPins?: Pin[]
  online?: boolean
}

/**
 * Schematic: ESP32 GPIO pins -> 220Ω resistors -> LEDs -> common GND rail.
 * Wires and LEDs render bright/labeled-HIGH when the pin is driven HIGH.
 */
export function LedWiringDiagram({ gpio, wiredPins, online = true }: LedWiringProps) {
  const shown = ALL_PINS.filter(p => (wiredPins ?? ALL_PINS).includes(p))
  const boardPins = shown.map(p => ({ label: p, sub: `GPIO${PIN_META[p].num}`, y: PIN_META[p].y }))

  return (
    <svg viewBox="0 0 660 340" className="w-full h-auto" role="img" aria-label="LED wiring diagram">
      <defs>
        <filter id="ledGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <Esp32Module pins={boardPins} />

      {/* GND rail */}
      <line x1={200} y1={318} x2={600} y2={318} stroke="#334155" strokeWidth={3} />
      <text x={200} y={334} fontSize={10} fill="#64748b" fontFamily="monospace">GND</text>
      {/* GND symbol */}
      <g transform="translate(600 318)">
        <line x1={0} y1={0} x2={0} y2={8} stroke="#334155" strokeWidth={2} />
        <line x1={-8} y1={8} x2={8} y2={8} stroke="#334155" strokeWidth={2} />
        <line x1={-4} y1={11} x2={4} y2={11} stroke="#334155" strokeWidth={2} />
      </g>

      {shown.map(p => {
        const meta = PIN_META[p]
        const on = gpio?.[p] === 1 && online
        const ledX = 470
        return (
          <g key={p}>
            {/* GPIO -> resistor wire */}
            <path
              d={`M 176 ${meta.y} H 268`}
              stroke={on ? meta.color : '#cbd5e1'}
              strokeWidth={on ? 2.5 : 1.5}
              fill="none"
            />
            {/* resistor */}
            <rect x={268} y={meta.y - 7} width={72} height={14} rx={3}
              fill="#fef3c7" stroke="#b45309" strokeWidth={1.2} />
            <text x={304} y={meta.y + 3.5} textAnchor="middle" fontSize={9}
              fill="#92400e" fontFamily="monospace">220Ω</text>
            {/* resistor -> LED anode */}
            <path d={`M 340 ${meta.y} H ${ledX - 14}`} stroke={on ? meta.color : '#cbd5e1'}
              strokeWidth={on ? 2.5 : 1.5} fill="none" />
            {/* LED */}
            <circle cx={ledX} cy={meta.y} r={14}
              fill={on ? meta.color : '#e2e8f0'}
              stroke={on ? '#78350f' : '#94a3b8'} strokeWidth={1.5}
              filter={on ? 'url(#ledGlow)' : undefined} />
            {/* cathode -> GND rail */}
            <path d={`M ${ledX + 14} ${meta.y} H ${ledX + 30} V 318`}
              stroke="#475569" strokeWidth={1.5} fill="none" />
            <circle cx={ledX + 30} cy={318} r={2.5} fill="#475569" />
            {/* pin name */}
            <text x={ledX} y={meta.y + 30} textAnchor="middle" fontSize={11}
              fill="#334155" fontFamily="monospace" fontWeight="bold">{p}</text>
            {/* HIGH / LOW badge */}
            <text
              x={ledX + 26} y={meta.y - 18} textAnchor="middle"
              fontSize={12} fontFamily="monospace" fontWeight="bold"
              fill={on ? '#059669' : '#94a3b8'}
            >
              {on ? 'HIGH' : 'LOW'}
            </text>
          </g>
        )
      })}

      {!online && (
        <g>
          <rect x={0} y={0} width={660} height={340} fill="#f8fafc" opacity={0.65} />
          <text x={330} y={170} textAnchor="middle" fontSize={16} fontFamily="monospace"
            fontWeight="bold" fill="#94a3b8">⏻ DEVICE OFFLINE</text>
        </g>
      )}
    </svg>
  )
}

interface LcdWiringProps {
  /** Live text currently rendered on the LCD rows */
  row1: string
  row2: string
  online?: boolean
}

/**
 * Schematic: ESP32 -> I2C 16×2 LCD (addr 0x27) over VCC / GND / SDA / SCL.
 * The LCD face renders the live row text coming from the flashed firmware.
 */
export function LcdWiringDiagram({ row1, row2, online = true }: LcdWiringProps) {
  const wires = [
    { label: 'VCC 5V', sub: 'VIN', y: 108, color: '#dc2626' },
    { label: 'GND', sub: 'GND', y: 142, color: '#334155' },
    { label: 'SDA', sub: 'GPIO21', y: 186, color: '#2563eb' },
    { label: 'SCL', sub: 'GPIO22', y: 226, color: '#0d9488' },
  ]

  return (
    <svg viewBox="0 0 660 300" className="w-full h-auto" role="img" aria-label="LCD wiring diagram">
      <Esp32Module pins={wires.map(w => ({ label: w.label, sub: w.sub, y: w.y }))} />

      {wires.map(w => (
        <g key={w.label}>
          <path d={`M 176 ${w.y} H 420`} stroke={online ? w.color : '#cbd5e1'} strokeWidth={2} fill="none" />
          <circle cx={176} cy={w.y} r={3} fill={online ? w.color : '#cbd5e1'} />
          <circle cx={420} cy={w.y} r={3} fill={online ? w.color : '#cbd5e1'} />
          <text x={298} y={w.y - 6} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">{w.label}</text>
        </g>
      ))}

      {/* LCD module */}
      <g transform="translate(420 56)">
        <rect x={0} y={0} width={200} height={200} rx={8} fill="#15803d" stroke="#14532d" strokeWidth={2} />
        <rect x={16} y={22} width={168} height={104} rx={4} fill="#166534" />
        {/* live screen */}
        <rect x={22} y={28} width={156} height={92} rx={2}
          fill={online ? '#1e3a5f' : '#0f172a'} stroke="#0f172a" strokeWidth={1} />
        <text x={30} y={62} fontSize={14} fill={online ? '#d9f99d' : '#475569'} fontFamily="monospace">
          {(row1 || '').slice(0, 16).padEnd(16, '\u00a0')}
        </text>
        <text x={30} y={92} fontSize={14} fill={online ? '#d9f99d' : '#475569'} fontFamily="monospace">
          {(row2 || '').slice(0, 16).padEnd(16, '\u00a0')}
        </text>
        <text x={100} y={152} textAnchor="middle" fontSize={10} fill="#dcfce7" fontFamily="monospace">
          LCD 16×2 · I2C 0x27
        </text>
        <text x={100} y={170} textAnchor="middle" fontSize={9} fill="#bbf7d0" fontFamily="monospace">
          SDA·SCL·VCC·GND
        </text>
        {/* I2C pins on the backpack */}
        {wires.map((w, i) => (
          <g key={w.label}>
            <rect x={-8} y={w.y - 56 - 6} width={16} height={12} rx={2} fill="#facc15" stroke="#a16207" strokeWidth={1} />
            <text x={-14} y={w.y - 56 + 4} textAnchor="end" fontSize={9} fill="#166534" fontFamily="monospace">{w.label.split(' ')[0]}</text>
          </g>
        ))}
      </g>

      {!online && (
        <g>
          <rect x={0} y={0} width={660} height={300} fill="#f8fafc" opacity={0.65} />
          <text x={330} y={150} textAnchor="middle" fontSize={16} fontFamily="monospace"
            fontWeight="bold" fill="#94a3b8">⏻ DEVICE OFFLINE</text>
        </g>
      )}
    </svg>
  )
}
