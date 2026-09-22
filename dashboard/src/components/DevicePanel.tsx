import React, { useState, useEffect, useRef } from 'react'
import type { Device, LogEntry } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'
import { LedIndicator } from '@shared/components/LedIndicator'
import { LcdScreen } from '@shared/components/LcdScreen'
import { api } from '../hooks/useWebSocket'

const FIRMWARE_VERSIONS = ['v1.0.0', 'v1.1.0', 'v1.2.0']

interface Props {
  device: Device
  onClose: () => void
  onOTA: (id: string, version: string) => Promise<void>
}

export function DevicePanel({ device, onClose, onOTA }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const gpio = device.gpio ?? { D0: 0, D1: 0, D2: 0, D3: 0 }
  const lcd = device.lcd ?? { row1: '', row2: '' }
  const isUpdating = (device.ota_progress ?? 0) > 0
  const availableFw = FIRMWARE_VERSIONS.filter(v => v !== device.firmware)

  useEffect(() => {
    api.get(`/api/devices/${device.id}/logs`).then(setLogs)
  }, [device.id])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function handleOTA() {
    const target = availableFw[availableFw.length - 1]
    if (!target) return
    await onOTA(device.id, target)
  }

  async function handleRollback(version: string) {
    await api.post('/api/ota/rollback', { device_id: device.id, version })
  }

  const logColor = (level: string) => {
    if (level === 'WARN') return 'text-amber-400'
    if (level === 'ERROR') return 'text-rose-400'
    return 'text-emerald-400'
  }

  return (
    <aside className="w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden animate-slide-in shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="font-mono font-bold text-cyan-700 text-base">{device.id}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-mono font-semibold ${device.online ? 'text-emerald-700' : 'text-rose-600'}`}>
              ● {device.online ? 'ONLINE' : 'OFFLINE'}
            </span>
            <span className="text-xs text-slate-500 font-mono">{device.group}</span>
            <span className="text-xs text-slate-400 font-mono">{device.mac}</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
          ✕
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {/* Board + visual */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3">
          <Esp32Board size="sm" template={device.template} isUpdating={isUpdating}
                      isOffline={!device.online} pins={{ D0: gpio.D0, D1: gpio.D1 }}/>

          {device.template === 'led' && (
            <div className="flex justify-around w-full pt-2">
              <LedIndicator on={gpio.D0 === 1} label="LED 1" size="sm"/>
              <LedIndicator on={gpio.D1 === 1} label="LED 2" size="sm"/>
            </div>
          )}
          {device.template === 'lcd' && (
            <LcdScreen row1={lcd.row1} row2={lcd.row2} size="sm"/>
          )}
        </div>

        {/* Firmware history */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">FIRMWARE</div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-xs text-slate-500 font-mono">Current</div>
              <div className="font-mono font-bold text-slate-900">{device.firmware}</div>
            </div>
            {availableFw.length > 0 && !isUpdating && (
              <button onClick={handleOTA}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-lg font-bold shadow-xs transition-colors">
                ⬆ {availableFw[availableFw.length - 1]}
              </button>
            )}
          </div>
          {isUpdating && (
            <div className="mb-3">
              <div className="flex justify-between text-xs font-mono text-cyan-700 font-bold mb-1">
                <span>Flashing...</span><span>{device.ota_progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-600 transition-all duration-500"
                     style={{ width: `${device.ota_progress}%` }}/>
              </div>
            </div>
          )}
          <div className="text-xs font-mono font-semibold text-slate-500 mb-1.5">History</div>
          {FIRMWARE_VERSIONS.map(v => (
            <div key={v} className="flex items-center justify-between py-1.5 border-t border-slate-200/80">
              <span className={`font-mono text-xs ${v === device.firmware ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{v}</span>
              {v !== device.firmware && (
                <button onClick={() => handleRollback(v)}
                  className="text-xs font-mono text-amber-700 hover:text-amber-800 font-bold transition-colors">
                  ↺ Rollback
                </button>
              )}
              {v === device.firmware && <span className="text-xs text-emerald-700 font-mono font-semibold">● current</span>}
            </div>
          ))}
        </div>

        {/* Live logs */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">LIVE LOGS</div>
          <div className="bg-slate-900 rounded-lg p-3 h-44 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
            {logs.length === 0
              ? <div className="text-slate-500 italic">No logs yet...</div>
              : logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={`shrink-0 font-bold ${logColor(log.level)}`}>[{log.level}]</span>
                  <span className="text-slate-200 break-all">{log.msg}</span>
                </div>
              ))
            }
            <div ref={logEndRef}/>
          </div>
        </div>
      </div>
    </aside>
  )
}
