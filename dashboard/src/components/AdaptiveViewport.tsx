import React, { useRef, useState, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  baseHeight?: number
  minWidth?: number
  className?: string
}

export function AdaptiveViewport({
  children,
  baseHeight = 770,
  minWidth = 1080,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledWidth, setScaledWidth] = useState<number | string>('100%')
  const [scaledHeight, setScaledHeight] = useState<number | string>('100%')
  const [useTransform, setUseTransform] = useState(false)

  useEffect(() => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      setUseTransform(!CSS.supports('zoom', '1'))
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateScale = () => {
      const availWidth = el.clientWidth
      const availHeight = el.clientHeight

      if (!availWidth || !availHeight) return

      // Calculate scale factor:
      // scaleH ensures all content rows fit vertically inside available height
      // scaleW ensures the layout does not cram below minWidth
      const scaleH = availHeight / baseHeight
      const scaleW = availWidth / minWidth
      const rawScale = Math.min(scaleH, scaleW)

      // Clamp scale between 0.52 (very small laptop/dev tools) and 1.65 (large 4K/1440p displays)
      const finalScale = Math.min(Math.max(rawScale, 0.52), 1.65)
      setScale(finalScale)

      // When using zoom, setting width to availWidth / finalScale ensures the visual width
      // spans 100% of the available viewport without black bars or letterboxing
      const w = Math.max(availWidth / finalScale, minWidth)
      const h = availHeight / finalScale
      setScaledWidth(w)
      setScaledHeight(h)
    }

    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(el)
    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [baseHeight, minWidth])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden flex items-start justify-center ${className}`}
    >
      <div
        style={
          useTransform
            ? {
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                width: minWidth,
                height: baseHeight,
              }
            : ({
                width: scaledWidth,
                height: scaledHeight,
                zoom: scale,
              } as React.CSSProperties)
        }
        className="h-full flex flex-col justify-between shrink-0"
      >
        {children}
      </div>
    </div>
  )
}
