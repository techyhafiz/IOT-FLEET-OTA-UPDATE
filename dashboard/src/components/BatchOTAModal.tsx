import React, { useState, useEffect } from 'react'
import type { Device, FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface DeviceOTAState {
  id: string
  progress: number
  status: 'queued' | 'running' | 'done' | 'error'
}

interface Props {
  deviceIds: string[]
  devices: Device[]
  firmware: FirmwareVersion[]
  onClose: () => void
}

export function BatchOTAModal({ deviceIds, devices, firmware, onClose }: Props) {
  const [version, setVersion] = useState(firmware[0]?.version ?? 'v1.2.0')
  const [otaStates, setOtaStates] = useState<DeviceOTAState[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const targetDevices = devices.filter(d => deviceIds.includes(d.id))
  const overallProgress = otaStates.length === 0 ? 0
    : Math.round(otaStates.reduce((s, d) => s + d.progress, 0) / otaStates.length)

  async function handlePush() {
    setRunning(true)
    setOtaStates(deviceIds.map(id => ({ id, progress: 0, status: 'queued' })))
    await api.post('/api/ota/push', { device_ids: deviceIds, version })

    // Simulate staggered progress updates in UI for visual effect
    const intervals: ReturnType<typeof setInterval>[] = []
    deviceIds.forEach((id, idx) => {
      const delay = idx * 300
      setTimeout(() => {
        setOtaStates(prev => prev.map(s => s.id === id ? { ...s, status: 'running' } : s))
        let p = 0
        const iv = setInterval(() => {
          p = Math.min(p + 10 + Math.floor(Math.random() * 5), 100)
          setOtaStates(prev => prev.map(s =>
            s.id === id ? { ...s, progress: p, status: p === 100 ? 'done' : 'running' } : s
          ))
          if (p >= 100) clearInterval(iv)
        }, 600 + Math.random() * 200)
        intervals.push(iv)
      }, delay)
    })

    // Check completion
    const checkDone = setInterval(() => {
      setOtaStates(prev => {
        const allDone = prev.every(s => s.status === 'done')
        if (allDone) {
          clearInterval(checkDone)
          setDone(true)
          setRunning(false)
        }
        return prev
      })
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-base font-bold text-cyan-400 font-mono">⬆ Batch OTA Update</h2>
          {!running && <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>}
        </div>

        <div className="p-5 space-y-4">
          {/* Config row */}
          {!running && !done && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-mono text-slate-400 mb-1 block">Firmware Version</label>
                <select value={version} onChange={e => setVersion(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                  {firmware.map(fw => (
                    <option key={fw.version} value={fw.version}>{fw.version}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm font-mono text-slate-400 mt-5">
                → {deviceIds.length} device{deviceIds.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Device progress list */}
          {otaStates.length > 0 && (
            <div className="space-y-2.5">
              {otaStates.map(state => {
                const device = targetDevices.find(d => d.id === state.id)
                return (
                  <div key={state.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-slate-200">{state.id}</span>
                        <span className="text-xs text-slate-500 font-mono">{device?.group}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">{state.progress}%</span>
                        {state.status === 'done' && <span className="text-green-400 text-sm">✅</span>}
                        {state.status === 'queued' && <span className="text-slate-500 text-xs font-mono">⏸ queued</span>}
                        {state.status === 'error' && <span className="text-red-400 text-sm">❌</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          state.status === 'done' ? 'bg-green-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Overall progress */}
          {running && (
            <div className="border-t border-slate-700 pt-3">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                     style={{ width: `${overallProgress}%` }}/>
              </div>
            </div>
          )}

          {done && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
              <div className="text-green-400 font-mono font-bold">✅ All devices updated to {version}</div>
            </div>
          )}

          {/* Targets preview (before push) */}
          {!running && !done && (
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-500">Targets:</div>
              {targetDevices.map(d => (
                <div key={d.id} className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">{d.id}</span>
                  <span className="text-slate-500">{d.firmware} → {version}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700">
          {!done ? (
            <>
              {!running && (
                <button onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-600 text-slate-400 hover:text-slate-300 font-mono text-sm rounded-lg transition-colors">
                  Cancel
                </button>
              )}
              {!running && (
                <button onClick={handlePush}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm font-bold rounded-lg transition-colors">
                  ⬆ Push to All
                </button>
              )}
              {running && (
                <div className="flex-1 text-center text-sm font-mono text-cyan-400 animate-pulse py-2.5">
                  Updating {deviceIds.length} devices...
                </div>
              )}
            </>
          ) : (
            <button onClick={onClose}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-sm rounded-lg transition-colors">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
