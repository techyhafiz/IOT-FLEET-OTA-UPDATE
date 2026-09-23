import { useEffect, useRef, useCallback } from 'react'
import type { Device } from '@shared/types'
import { api } from './useWebSocket'

// ── Cross-component wiring ────────────────────────────────────────────────
// DeviceSimulationWorker registers controls here; detail views consume them.
const controlRegistry = new Map<string, SimulatorControls>()
export function getSimControls(id: string): SimulatorControls | undefined {
  return controlRegistry.get(id)
}

export interface LocalLogEntry { timestamp: string; level: string; msg: string; device_id: string }
const logListeners = new Set<(e: LocalLogEntry) => void>()
export const logBus = {
  emit: (e: LocalLogEntry) => logListeners.forEach(f => f(e)),
  subscribe: (f: (e: LocalLogEntry) => void) => {
    logListeners.add(f)
    return () => { logListeners.delete(f) }
  },
}

/**
 * Guards against duplicate simulation loops per device. React StrictMode
 * (dev) and route re-mounts can briefly run two effect instances; without
 * this, a device would double-poll OTA and flash twice.
 */
const loopLocks = new Set<string>()

/**
 * useDeviceSimulator — the "firmware" running on each virtual ESP32.
 *
 * Per device, only while powered on:
 *  - real uptime (seconds since power-on) heartbeated every 2s
 *  - OTA poll every 5s → staged download → flash → reboot
 *  - offline + update pending → reports "failed", server keeps retrying;
 *    power back on → update applies (retry succeeded)
 *  - GPIO/LCD outputs are owned by the flashed firmware (backend behaviour
 *    engine) or explicit local actions — never randomised
 *
 * No simulated temperature/heap/RSSI: the UI shows only what is real.
 */

const HEARTBEAT_MS = 2000
const OTA_POLL_MS = 5000
const LOG_BUFFER = 200

export interface SimulatorControls {
  togglePin: (pin: 'D0' | 'D1' | 'D2' | 'D3') => void
  setLcdRow: (row: 1 | 2, text: string) => void
  setOnline: (online: boolean) => void
  pushLog: (msg: string, level?: 'INFO' | 'WARN' | 'ERROR') => void
}

export function useDeviceSimulator(
  device: Device,
  enabled: boolean,
  onLocalLog?: (msg: string, level?: 'INFO' | 'WARN' | 'ERROR') => void
): SimulatorControls {
  const deviceId = device.id
  const template = device.template

  // ── Mutable device "RAM" ────────────────────────────────────────────────
  const uptimeRef = useRef(0)
  const gpioRef = useRef(device.gpio ?? { D0: 0, D1: 0, D2: 0, D3: 0 })
  const lcdRef = useRef(device.lcd)
  const onlineRef = useRef(device.online !== false)
  const otaJobRef = useRef<{ pending: boolean; version: string | null }>({ pending: false, version: null })
  const localLogsRef = useRef<LocalLogEntry[]>([])
  const failedReportedRef = useRef<string | null>(null)

  // Sync from props when the server state changes from outside (OTA complete etc.)
  const deviceRef = useRef(device)
  deviceRef.current = device
  useEffect(() => { gpioRef.current = device.gpio ?? gpioRef.current }, [device.gpio])
  useEffect(() => { lcdRef.current = device.lcd ?? lcdRef.current }, [device.lcd])
  useEffect(() => {
    // After OTA completes, backend resets uptime to 0 — follow it
    if (device.uptime === 0) uptimeRef.current = 0
  }, [device.uptime])

  const now = () => new Date().toLocaleTimeString('en-GB') // HH:MM:SS

  // ── Local log buffer (mirrored to backend for the dashboard) ────────────
  const pushLocalLog = useCallback((msg: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') => {
    const entry: LocalLogEntry = { timestamp: now(), level, msg, device_id: deviceId }
    localLogsRef.current = [...localLogsRef.current.slice(-LOG_BUFFER), entry]
    logBus.emit(entry)
    onLocalLog?.(msg, level)
    // Fire-and-forget mirror to backend (feeds dashboard live logs too)
    api.post(`/api/devices/${deviceId}/logs`, { level, msg }).catch(() => {})
  }, [deviceId, onLocalLog])

  // ── Status post ─────────────────────────────────────────────────────────
  // `outputs: false` for periodic heartbeats — GPIO/LCD are owned by the
  // flashed firmware (backend behaviour engine) or explicit local actions.
  const sendStatus = useCallback(async (extra?: Record<string, unknown>, opts?: { outputs?: boolean }) => {
    const body: Record<string, unknown> = {
      online: onlineRef.current,
      uptime: Math.round(uptimeRef.current),
      ...extra,
    }
    if (opts?.outputs !== false) {
      if (gpioRef.current) body.gpio = gpioRef.current
      if (lcdRef.current) {
        body.lcd_row1 = lcdRef.current.row1
        body.lcd_row2 = lcdRef.current.row2
      }
    }
    try {
      await api.post(`/api/devices/${deviceId}/status`, body)
    } catch {
      // Backend unreachable — device keeps "running", nothing to do
    }
  }, [deviceId])

  // ── One OTA poll, exactly like real ESP32 HTTPUpdate polling ────────────
  const pollOnce = useCallback(async () => {
    if (otaJobRef.current.pending) return
    if (!onlineRef.current) {
      // Powered off but an update is pending → report failure (once per
      // version); the server keeps it pending and shows "retrying".
      const pending = deviceRef.current.ota_pending
      if (pending && failedReportedRef.current !== pending) {
        failedReportedRef.current = pending
        await sendStatus({ state: 'failed' }, { outputs: false })
      }
      return
    }
    // cache: 'no-store' is part of the OTA protocol contract here — without
    // it a browser HTTP cache can replay a stale 200 and cause flash loops.
    const res = await fetch(`${api.serverBase}/ota/update/${deviceId}`, { cache: 'no-store' })
    if (res.status !== 200) return
    // Preferred: version header. Fallback: JSON body (no binary on disk).
    let target: string | null = res.headers.get('X-Firmware-Version')
    if (!target) {
      try {
        const j = (await res.json()) as { version?: string }
        target = j?.version ?? null
      } catch { /* binary stream — header was the only source */ }
    }
    const fwNow = deviceRef.current.firmware
    if (target && target !== fwNow) runOTA(target)
  }, [deviceId, sendStatus])

  // ── OTA download job ────────────────────────────────────────────────────
  const runOTA = useCallback(async (targetVersion: string) => {
    if (otaJobRef.current.pending) return
    otaJobRef.current = { pending: true, version: targetVersion }
    pushLocalLog(`OTA update available → ${targetVersion}`, 'INFO')
    try {
      for (let p = 10; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 500))
        await sendStatus({ ota_progress: p }, { outputs: false })
        if (p % 50 === 0 && p < 100) pushLocalLog(`Downloading firmware... ${p}%`)
      }
      await new Promise(r => setTimeout(r, 300))
      pushLocalLog('Flash write complete ✓')
      pushLocalLog(`Rebooting → ${targetVersion}`, 'WARN')
      await new Promise(r => setTimeout(r, 400))
      await sendStatus({ state: 'complete', firmware: targetVersion, uptime: 0 }, { outputs: false })
      uptimeRef.current = 0
      failedReportedRef.current = null
      pushLocalLog(`Boot successful — running ${targetVersion}`)
    } finally {
      otaJobRef.current = { pending: false, version: null }
    }
  }, [deviceId, sendStatus, pushLocalLog])

  // ── Main loop: heartbeat + OTA poll ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    // Loop lock: if another instance is already simulating this device, skip.
    // (React StrictMode / route remounts can briefly run two effect copies.)
    if (loopLocks.has(deviceId)) return
    loopLocks.add(deviceId)

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const every = (ms: number, fn: () => void) => {
      const t = setInterval(() => { if (!cancelled) fn() }, ms)
      timers.push(t)
      return t
    }

    // 1) Heartbeat — every 2s. Real uptime only; dynamic LCD rows (ip/uptime
    // presets) render their live text here.
    every(HEARTBEAT_MS, () => {
      uptimeRef.current += HEARTBEAT_MS / 1000
      const dyn = deviceRef.current.fw_dynamic
      if (dyn && template === 'lcd') {
        const up = Math.round(uptimeRef.current)
        const mm = String(Math.floor(up / 60)).padStart(2, '0')
        const ss = String(up % 60).padStart(2, '0')
        const rows = dyn === 'uptime'
          ? { row1: `Uptime: ${mm}:${ss}`, row2: 'SYS: ONLINE' }
          : { row1: `IP:${deviceRef.current.ip ?? '—'}`.slice(0, 16), row2: 'OTA:READY' }
        lcdRef.current = rows
        sendStatus({ lcd_row1: rows.row1, lcd_row2: rows.row2 }, { outputs: false })
      } else {
        sendStatus(undefined, { outputs: false })
      }
    })

    // 2) OTA poll — every 5s (or failure report while powered off)
    every(OTA_POLL_MS, () => { pollOnce().catch(() => {}) })

    return () => {
      cancelled = true
      timers.forEach(clearInterval)
      loopLocks.delete(deviceId)
    }
  }, [enabled, deviceId, template, sendStatus, pollOnce])

  // ── First boot log when enabled ─────────────────────────────────────────
  const bootedRef = useRef(false)
  useEffect(() => {
    if (!enabled) return
    if (bootedRef.current) return // StrictMode double-mount guard
    bootedRef.current = true
    pushLocalLog(`Boot OK — ${template.toUpperCase()} hardware, firmware ${device.firmware}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, deviceId])

  // ── Public controls (used by UI buttons) ────────────────────────────────
  const togglePin = useCallback((pin: 'D0' | 'D1' | 'D2' | 'D3') => {
    const g = { ...gpioRef.current }
    g[pin] = g[pin] === 1 ? 0 : 1
    gpioRef.current = g
    pushLocalLog(`GPIO ${pin} → ${g[pin] === 1 ? 'HIGH' : 'LOW'}`)
    sendStatus()
  }, [pushLocalLog, sendStatus])

  const setLcdRow = useCallback((row: 1 | 2, text: string) => {
    const lcd = { ...(lcdRef.current ?? { row1: '', row2: '' }) }
    if (row === 1) lcd.row1 = text.slice(0, 16)
    else lcd.row2 = text.slice(0, 16)
    lcdRef.current = lcd
    pushLocalLog(`LCD row${row} set: "${text.slice(0, 16)}"`)
    sendStatus()
  }, [pushLocalLog, sendStatus])

  const setOnline = useCallback((online: boolean) => {
    onlineRef.current = online
    uptimeRef.current = 0 // power cycle restarts uptime — it's real now
    if (online) {
      pushLocalLog('Device powered on')
      // Powering on with an update still pending → the retry succeeds on boot.
      if (deviceRef.current.ota_pending) {
        sendStatus({ online: true, state: 'recovered', uptime: 0 }, { outputs: false })
      } else {
        sendStatus({ online: true, uptime: 0 })
      }
    } else {
      pushLocalLog('Device powered off', 'WARN')
      const pending = deviceRef.current.ota_pending
      sendStatus(pending ? { online: false, state: 'failed', uptime: 0 } : { online: false, uptime: 0 })
    }
  }, [pushLocalLog, sendStatus])

  const controls: SimulatorControls = { togglePin, setLcdRow, setOnline, pushLog: pushLocalLog }
  controlRegistry.set(deviceId, controls)

  return controls
}
