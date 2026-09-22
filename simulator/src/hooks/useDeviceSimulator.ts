import { useEffect, useRef, useCallback } from 'react'
import type { Device } from '@shared/types'
import { api } from './useWebSocket'

const LOG_LINES: Record<string, string[]> = {
  led: [
    'LED1 ON → D0 HIGH',
    'OTA check — no update',
    'Heap free: 218 KB',
    'WiFi RSSI: -47 dBm',
    'LED2 OFF → D1 LOW',
    'GPIO stable',
    'Loop tick',
    'Uptime OK',
  ],
  lcd: [
    'LCD updated: row1 set',
    'OTA check — no update',
    'I2C ACK: 0x27',
    'WiFi RSSI: -52 dBm',
    'Heap free: 204 KB',
    'LCD backlight ON',
    'Loop tick',
    'Uptime OK',
  ],
}

export function useDeviceSimulator(device: Device, enabled: boolean) {
  const uptimeRef = useRef(device.uptime ?? 0)
  const logIdxRef = useRef(0)
  const otaProgressRef = useRef<number | null>(null)
  const gpioRef = useRef(device.gpio)
  const lcdRef = useRef(device.lcd)

  // Keep refs in sync when device changes from outside (preset applied etc.)
  useEffect(() => {
    gpioRef.current = device.gpio
    lcdRef.current = device.lcd
  }, [device.gpio, device.lcd])

  const sendStatus = useCallback(async (extra?: Record<string, unknown>) => {
    await api.post(`/api/devices/${device.id}/status`, {
      online: true,
      uptime: uptimeRef.current,
      gpio: gpioRef.current,
      ...(lcdRef.current
        ? { lcd_row1: lcdRef.current.row1, lcd_row2: lcdRef.current.row2 }
        : {}),
      ...extra,
    })
  }, [device.id])

  const sendLog = useCallback(async (msg: string, level = 'INFO') => {
    await api.post(`/api/devices/${device.id}/logs`, { level, msg })
  }, [device.id])

  const runOTA = useCallback(async (targetVersion: string) => {
    otaProgressRef.current = 0
    for (let p = 10; p <= 100; p += 10) {
      await new Promise(r => setTimeout(r, 500))
      otaProgressRef.current = p
      await sendStatus({ ota_progress: p })
      await sendLog(`Downloading firmware... ${p}%`)
    }
    await new Promise(r => setTimeout(r, 300))
    await sendLog('Flash write complete ✓')
    await sendLog(`Rebooting → ${targetVersion}`)
    await api.post(`/api/devices/${device.id}/status`, {
      state: 'complete',
      firmware: targetVersion,
      uptime: 0,
      gpio: gpioRef.current,
    })
    uptimeRef.current = 0
    otaProgressRef.current = null
  }, [device.id, sendStatus, sendLog])

  useEffect(() => {
    if (!enabled) return

    // Heartbeat every 2s
    const heartbeat = setInterval(async () => {
      uptimeRef.current += 2
      await sendStatus()
    }, 2000)

    // Log every 5s
    const logInterval = setInterval(async () => {
      const lines = LOG_LINES[device.template] ?? LOG_LINES.led
      const msg = lines[logIdxRef.current % lines.length]
      logIdxRef.current++
      await sendLog(msg)
    }, 5000)

    // OTA poll every 5s
    const otaPoll = setInterval(async () => {
      if (otaProgressRef.current !== null) return // already updating
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'}/ota/update/${device.id}`
        )
        if (res.status === 200) {
          const version = res.headers.get('X-Firmware-Version') ?? 'unknown'
          await sendLog(`OTA update available → ${version}`)
          runOTA(version)
        }
      } catch {}
    }, 5000)

    return () => {
      clearInterval(heartbeat)
      clearInterval(logInterval)
      clearInterval(otaPoll)
    }
  }, [enabled, device.id, device.template, device.mac, device.firmware, device.group, sendStatus, sendLog, runOTA])

  return { sendStatus, sendLog }
}
