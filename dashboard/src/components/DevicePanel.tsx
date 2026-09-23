import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Device, LogEntry, WSEvent } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'
import { LedIndicator } from '@shared/components/LedIndicator'
import { LcdScreen } from '@shared/components/LcdScreen'
import { api, useWebSocket } from '../hooks/useWebSocket'

interface Props {
  device: Device
  onClose: () => void
  onOTA: (id: string, version: string) => Promise<void>
}

export function DevicePanel({ device, onClose, onOTA }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fwList, setFwList] = useState<string[]>(['v1.0.0', 'v1.1.0', 'v1.2.0'])
  const logEndRef = useRef<HTMLDivElement>(null)
  const gpio = device.gpio ?? { D0: 0, D1: 0, D2: 0, D3: 0 }
  const lcd = device.lcd ?? { row1: '', row2: '' }
  const isUpdating = (device.ota_progress ?? 0) > 0
  const availableFw = fwList
    .filter(v => v !== device.firmware && !v.toLowerCase().includes('faulty'))
  // Semantically newest version first (vX.Y.Z compare) — never "update" backwards
  const sortedAvailable = availableFw.slice().sort((a, b) => {
    const pa = a.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    const pb = b.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
    for (let i = 0; i < 3; i++) if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0)
    return 0
  })
  const latestAvailable = sortedAvailable[0]

  useEffect(() => {
    api.get(`/api/devices/${device.id}/logs`).then(setLogs).catch(() => {})
    api.get('/api/firmware/versions').then((v: string[]) =>
      setFwList(v.filter(x => !x.toLowerCase().includes('faulty')))
    ).catch(() => {})
  }, [device.id])

  // Live log stream for THIS device over WebSocket
  useWebSocket(useCallback((event: WSEvent) => {
    if (event.type === 'device_log' && event.device_id === device.id) {
      setLogs(prev => [...prev.slice(-199), event.payload as LogEntry])
    }
  }, [device.id]))

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function handleOTA() {
    const target = latestAvailable
    if (!target) return
    await onOTA(device.id, target)
  }

  async function handleRollback(version: string) {
    await api.post('/api/ota/rollback', { device_id: device.id, version })
    // Re-fetch so the "current" marker moves once the device completes the flash
  }

  const logColor = (level: string) => {
    if (level === 'WARN') return 'text-amber-600'
    if (level === 'ERROR') return 'text-rose-600'
    return 'text-emerald-600'
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header — Matching Update Firmware Modal style */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-slate-900 text-base">{device.id}</h3>
                {device.online ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Offline
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
                  FW: {device.firmware}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {device.ip ?? '—'} · {device.mac} · Group: {device.group} · Uptime {Math.floor((device.uptime ?? 0) / 60)}m {Math.round((device.uptime ?? 0) % 60)}s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content — Wide and compact, no scrolling needed */}
        <div className="p-5 space-y-4">
          {/* Update failed — device unreachable, server keeps retrying */}
          {device.ota_state === 'failed' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Update failed — device offline. Retrying every 10s ({device.ota_pending}). Power it on in the simulator to complete.
            </div>
          )}
          {/* Cross-template firmware — device not responding */}
          {device.ota_state === 'incompatible' && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-3 py-2 text-xs font-semibold text-red-700">
              ⚠ Device not compatible / no response — flashed firmware does not match its {device.template.toUpperCase()} hardware. Power-cycle the device in the simulator to recover.
            </div>
          )}

          {/* OTA Progress if active */}
          {isUpdating && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-bold text-amber-800">
                <span>⚡ FLASHING FIRMWARE</span>
                <span>{device.ota_progress}%</span>
              </div>
              <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${device.ota_progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Hardware Visual & Firmware Number */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* Board Visual */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center py-4 gap-2.5 flex-1 justify-center">
                <Esp32Board
                  size="sm"
                  template={device.template}
                  isUpdating={isUpdating}
                  isOffline={!device.online}
                  pins={{ D0: gpio.D0, D1: gpio.D1 }}
                />
                {device.template === 'led' && (
                  <div className="flex justify-around w-full px-6 pt-1">
                    <LedIndicator on={gpio.D0 === 1} label="LED 1" size="sm" />
                    <LedIndicator on={gpio.D1 === 1} label="LED 2" size="sm" />
                  </div>
                )}
                {device.template === 'lcd' && (
                  <div className="px-4 w-full">
                    <LcdScreen row1={lcd.row1} row2={lcd.row2} size="sm" />
                  </div>
                )}
              </div>

              {/* Firmware Info Card — Only Firmware No shown as requested */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Installed Firmware</span>
                  <span className="font-mono text-xs text-slate-500">Release Build</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-base text-emerald-600 block">{device.firmware}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Active & Running</span>
                </div>
              </div>
            </div>

            {/* Column 2: Firmware Lifecycle & Live Logs */}
            <div className="space-y-3 flex flex-col">
              {/* Firmware Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firmware Lifecycle</p>
                  {availableFw.length > 0 && !isUpdating && (
                    <button
                      onClick={handleOTA}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <span>⬆</span>
                      <span>Update to {latestAvailable}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-0 text-xs">
                  {fwList.map(v => (
                    <div key={v} className="flex items-center justify-between py-1.5 border-t border-slate-200/80 first:border-0">
                      <span className={`font-mono ${v === device.firmware ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                        {v}
                      </span>
                      {v === device.firmware && (
                        <span className="text-[10px] font-semibold text-emerald-700 font-mono">● current</span>
                      )}
                      {v !== device.firmware && (
                        <button
                          onClick={() => handleRollback(v)}
                          className="text-[11px] font-mono text-amber-700 hover:text-amber-900 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>↺</span>
                          <span>Rollback</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Logs */}
              <div className="rounded-xl overflow-hidden border border-slate-200 flex-1 flex flex-col bg-white">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Device Logs</span>
                  <span className="text-[10px] font-mono text-slate-400">{logs.length} entries</span>
                </div>
                <div className="bg-slate-50/70 p-3 h-36 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-slate-400 italic">No logs yet...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                        <span className={`shrink-0 font-bold ${logColor(log.level)}`}>[{log.level}]</span>
                        <span className="text-slate-700 break-all">{log.msg}</span>
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
