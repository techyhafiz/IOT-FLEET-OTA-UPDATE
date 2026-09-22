import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Device, LogEntry } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'
import { LedIndicator } from '@shared/components/LedIndicator'
import { LcdScreen } from '@shared/components/LcdScreen'
import { CodeViewerModal } from '../components/CodeViewerModal'
import { ResetFirmwareModal } from '../components/ResetFirmwareModal'
import { api } from '../hooks/useWebSocket'

const FIRMWARE_VERSIONS = ['v1.0.0', 'v1.1.0', 'v1.2.0']

interface Props {
  devices: Device[]
  onDeviceUpdate: (d: Device) => void
}

export function DeviceDetail({ devices, onDeviceUpdate }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showCode, setShowCode] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const device = devices.find(d => d.id === id)

  useEffect(() => {
    if (!id) return
    api.get(`/api/devices/${id}/logs`).then(setLogs).catch(() => {})
  }, [id])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!device) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 font-mono">Device not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-cyan-600 underline font-mono text-sm">
          ← Back to grid
        </button>
      </div>
    )
  }

  const gpio = device.gpio ?? { D0: 0, D1: 0, D2: 0, D3: 0 }
  const lcd = device.lcd ?? { row1: 'Hello World!', row2: 'Sys: RUNNING' }
  const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
  const availableFw = FIRMWARE_VERSIONS.filter(v => v !== device.firmware)

  async function handleOTA() {
    const target = availableFw[availableFw.length - 1]
    if (!target) return
    await api.post('/api/ota/push', { device_ids: [device!.id], version: target })
    await api.post(`/api/devices/${device!.id}/logs`, {
      level: 'INFO',
      msg: `OTA initiated → ${target}`,
    })
    api.get(`/api/devices/${device!.id}/logs`).then(setLogs)
  }

  async function handleReset(version: string) {
    await api.post('/api/ota/rollback', { device_id: device!.id, version })
    setShowReset(false)
    await api.post(`/api/devices/${device!.id}/logs`, {
      level: 'WARN',
      msg: `Rollback to ${version} initiated`,
    })
    api.get(`/api/devices/${device!.id}/logs`).then(setLogs)
  }

  const logColor = (level: string) => {
    if (level === 'WARN') return 'text-amber-600'
    if (level === 'ERROR') return 'text-rose-600'
    return 'text-emerald-600'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')}
          className="text-slate-500 hover:text-cyan-700 font-mono text-sm font-bold flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-2xl text-cyan-700">{device.id}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold ${device.online ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {device.online ? '● ONLINE' : '● OFFLINE'}
          </span>
          <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full font-mono font-medium text-slate-600">{device.group}</span>
          <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full font-mono font-medium text-slate-700">{device.firmware}</span>
          <span className="text-2xl">{device.template === 'lcd' ? '🖥' : '💡'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Board */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xs">
          <h3 className="text-xs font-mono font-bold text-slate-400 self-start uppercase tracking-wider">ESP32 BOARD</h3>
          <Esp32Board
            size="md"
            template={device.template}
            isUpdating={isUpdating}
            isOffline={!device.online}
            pins={{ D0: gpio.D0, D1: gpio.D1, D2: gpio.D2, D3: gpio.D3 }}
          />
          <div className="text-xs font-mono text-slate-400 text-center font-medium">
            MAC: {device.mac}
          </div>
        </div>

        {/* Middle: Visual state */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* LED Panel */}
          {device.template === 'led' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-mono font-bold text-slate-400 mb-4 uppercase tracking-wider">GPIO / LED STATE</h3>
              <div className="flex justify-around items-end py-2">
                <LedIndicator on={gpio.D0 === 1} label="LED 1 (D0)" size="lg"/>
                <LedIndicator on={gpio.D1 === 1} label="LED 2 (D1)" size="lg"/>
              </div>
              <div className="mt-4 space-y-2 text-xs font-mono">
                {(['D0','D1','D2','D3'] as const).map(pin => (
                  <div key={pin} className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold w-6">{pin}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${gpio[pin] ? 'bg-cyan-600 w-full' : 'w-0'}`}/>
                    </div>
                    <span className={`w-10 text-right font-bold ${gpio[pin] ? 'text-cyan-700' : 'text-slate-400'}`}>
                      {gpio[pin] ? 'HIGH' : 'LOW'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LCD Panel */}
          {device.template === 'lcd' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-xs font-mono font-bold text-slate-400 mb-4 uppercase tracking-wider">LCD SCREEN</h3>
              <div className="flex justify-center">
                <LcdScreen row1={lcd.row1} row2={lcd.row2} size="md"/>
              </div>
              <div className="mt-3 text-center text-xs font-mono text-slate-400 font-medium">
                I2C addr: 0x27 · Backlight: ON
              </div>
            </div>
          )}

          {/* OTA Firmware */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-mono font-bold text-slate-400 mb-3 uppercase tracking-wider">🔄 OTA FIRMWARE</h3>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-slate-500 font-mono">Installed</div>
                <div className="font-mono font-bold text-slate-900 text-base">{device.firmware}</div>
              </div>
              {availableFw.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-mono">Available</div>
                  <div className="font-mono font-bold text-amber-700">{availableFw[availableFw.length - 1]} 🆕</div>
                </div>
              )}
            </div>
            {isUpdating && (
              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono text-cyan-700 font-bold mb-1">
                  <span>Flashing...</span><span>{device.ota_progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                       style={{ width: `${device.ota_progress}%` }}/>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {availableFw.length > 0 && !isUpdating && (
                <button onClick={handleOTA}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-lg font-bold shadow-xs transition-colors">
                  ⬆ Update to {availableFw[availableFw.length - 1]}
                </button>
              )}
              <button onClick={() => setShowReset(true)}
                className="flex-1 py-2 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-800 font-mono text-xs rounded-lg font-bold transition-colors shadow-2xs">
                ↺ Reset Firmware
              </button>
            </div>
          </div>
        </div>

        {/* Right: Logs */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Live Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">📋 LIVE LOGS</h3>
              <button onClick={() => setLogs([])}
                className="text-xs font-mono text-slate-400 hover:text-slate-700 font-medium transition-colors">
                Clear
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex-1 min-h-[220px] max-h-[380px] overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 && (
                <div className="text-slate-400 italic">Waiting for log entries...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                  <span className={`shrink-0 font-bold ${logColor(log.level)}`}>[{log.level}]</span>
                  <span className="text-slate-700">{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef}/>
            </div>

            <button onClick={() => setShowCode(true)}
              className="mt-3.5 w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer">
              👁 View C++ Code
            </button>
          </div>
        </div>
      </div>

      {showCode && <CodeViewerModal device={device} onClose={() => setShowCode(false)}/>}
      {showReset && (
        <ResetFirmwareModal
          currentFirmware={device.firmware}
          onConfirm={handleReset}
          onClose={() => setShowReset(false)}
        />
      )}
    </div>
  )
}
