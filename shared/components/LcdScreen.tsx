import React from 'react'

interface Props {
  row1: string
  row2: string
  backlight?: boolean
  size?: 'sm' | 'md'
}

// Pad/truncate string to exactly 16 chars
const pad16 = (s: string) => s.slice(0, 16).padEnd(16, ' ')

export const LcdScreen: React.FC<Props> = ({
  row1,
  row2,
  backlight = true,
  size = 'md',
}) => {
  const scale = size === 'sm' ? 0.65 : 1
  const w = Math.round(280 * scale)
  const h = Math.round(100 * scale)

  const chars1 = pad16(row1).split('')
  const chars2 = pad16(row2).split('')

  const cellW = size === 'sm' ? 10 : 15
  const cellH = size === 'sm' ? 16 : 24
  const startX = size === 'sm' ? 10 : 16
  const row1Y  = size === 'sm' ? 18 : 26
  const row2Y  = size === 'sm' ? 38 : 58

  return (
    <div className="inline-block">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <filter id="lcd-glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* LCD housing */}
        <rect x="0" y="0" width={w} height={h} rx="6" fill="#1a2e1a" stroke="#166534" strokeWidth="2"/>

        {/* Screen area */}
        <rect x="6" y="6" width={w - 12} height={h - 12} rx="3"
              fill={backlight ? '#0a2e0a' : '#0a1a0a'}
              stroke={backlight ? '#166534' : '#0f2010'} strokeWidth="1"/>

        {/* Ambient backlight glow */}
        {backlight && (
          <rect x="6" y="6" width={w - 12} height={h - 12} rx="3"
                fill="none" stroke="#4ade8033" strokeWidth="8"/>
        )}

        {/* Row 1 characters */}
        {chars1.map((ch, i) => (
          <g key={i}>
            {/* Character cell background */}
            <rect x={startX + i * cellW} y={row1Y - cellH * 0.75}
                  width={cellW - 2} height={cellH}
                  fill={ch !== ' ' && backlight ? '#0a3a0a' : 'transparent'}/>
            {/* Character */}
            {ch !== ' ' && (
              <text
                x={startX + i * cellW + cellW * 0.4}
                y={row1Y}
                textAnchor="middle"
                fill={backlight ? '#fbbf24' : '#6b7280'}
                fontSize={size === 'sm' ? 9 : 13}
                fontFamily="'Courier New', monospace"
                fontWeight="bold"
                filter={backlight ? 'url(#lcd-glow)' : undefined}
              >{ch}</text>
            )}
          </g>
        ))}

        {/* Row 2 characters */}
        {chars2.map((ch, i) => (
          <g key={i}>
            <rect x={startX + i * cellW} y={row2Y - cellH * 0.75}
                  width={cellW - 2} height={cellH}
                  fill={ch !== ' ' && backlight ? '#0a3a0a' : 'transparent'}/>
            {ch !== ' ' && (
              <text
                x={startX + i * cellW + cellW * 0.4}
                y={row2Y}
                textAnchor="middle"
                fill={backlight ? '#fbbf24' : '#6b7280'}
                fontSize={size === 'sm' ? 9 : 13}
                fontFamily="'Courier New', monospace"
                fontWeight="bold"
                filter={backlight ? 'url(#lcd-glow)' : undefined}
              >{ch}</text>
            )}
          </g>
        ))}

        {/* Corner screws */}
        {[[4,4],[w-4,4],[4,h-4],[w-4,h-4]].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#374151"/>
        ))}
      </svg>
    </div>
  )
}

export default LcdScreen
