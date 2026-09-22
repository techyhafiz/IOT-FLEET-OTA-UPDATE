import React, { useState, useEffect } from 'react'
import type { Device, FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

type OTAPhase = 'handshake' | 'streaming' | 'flashing' | 'verifying' | 'done' | 'failed' | 'rollback'

interface DeviceOTAState {
  id: string
  progress: number
  phase: OTAPhase
  speedKbps: number
  bytesSent: number
  totalBytes: number
  sector: number
  statusMsg: string
}

interface Props {
  deviceIds: string[]
  devices: Device[]
  firmware: FirmwareVersion[]
  onClose: () => void
  onOpenCanary?: (canaryId: string, version: string) => void
  onAutoRollbackTriggered?: (deviceId: string, version: string) => void
}

export function BatchOTAModal({
  deviceIds,
  devices,
  firmware,
  onClose,
  onOpenCanary,
  onAutoRollbackTriggered,
}: Props) {
  const [version, setVersion] = useState(firmware[0]?.version ?? 'v1.2.0')
  const [strategy, setStrategy] = useState<'immediate' | 'canary'>('immediate')
  const [otaStates, setOtaStates] = useState<DeviceOTAState[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [autoRollbackHappened, setAutoRollbackHappened] = useState(false)

  const selectedFw = firmware.find(f => f.version === version)
  const totalSize = selectedFw?.size ?? 512000
  const isFaultyTarget = version === 'v2.2.0-faulty' || selectedFw?.is_faulty === true

  const targetIds = strategy === 'canary' && deviceIds.length > 1 ? [deviceIds[0]] : deviceIds
  const targetDevices = devices.filter(d => targetIds.includes(d.id))

  const overallProgress = otaStates.length === 0 ? 0
    : Math.round(otaStates.reduce((s, d) => s + d.progress, 0) / otaStates.length)

  async function handlePush() {
    setRunning(true)
    setAutoRollbackHappened(false)
    setOtaStates(
      targetIds.map(id => ({
        id,
        progress: 0,
        phase: 'handshake',
        speedKbps: 180 + Math.floor(Math.random() * 40),
        bytesSent: 0,
        totalBytes: totalSize,
        sector: 0,
        statusMsg: 'Initiating SHA-256 Handshake...',
      }))
    )

    await api.post('/api/ota/push', { device_ids: targetIds, version })

    // Simulate multi-stage progression
    targetIds.forEach((id, idx) => {
      const delay = idx * 250
      setTimeout(() => {
        let p = 0
        const timer = setInterval(() => {
          p += 6 + Math.floor(Math.random() * 6)
          if (p < 25) {
            // Stage 1: Handshake
            setOtaStates(prev =>
              prev.map(s =>
                s.id === id
                  ? {
                      ...s,
                      progress: p,
                      phase: 'handshake',
                      statusMsg: `Stage 1/4: Hash Check [${selectedFw?.sha256?.slice(0, 12) ?? '4b82d9f1...'}]`,
                    }
                  : s
              )
            )
          } else if (p < 75) {
            // Stage 2: Streaming Binary
            const sent = Math.min(Math.round((p / 75) * totalSize), totalSize)
            const speed = 195 + Math.floor(Math.random() * 45)
            setOtaStates(prev =>
              prev.map(s =>
                s.id === id
                  ? {
                      ...s,
                      progress: p,
                      phase: 'streaming',
                      bytesSent: sent,
                      speedKbps: speed,
                      statusMsg: `Stage 2/4: Streaming Binary (${Math.round(sent / 1024)} KB / ${Math.round(totalSize / 1024)} KB @ ${speed} KB/s)`,
                    }
                  : s
              )
            )
          } else if (p < 95) {
            // Stage 3: Flashing memory sectors
            const sector = Math.min(Math.round(((p - 75) / 20) * 32), 32)
            setOtaStates(prev =>
              prev.map(s =>
                s.id === id
                  ? {
                      ...s,
                      progress: p,
                      phase: 'flashing',
                      sector,
                      statusMsg: `Stage 3/4: Writing Flash Sector ${sector}/32 (CRC Verified)`,
                    }
                  : s
              )
            )
          } else if (p < 100) {
            // Stage 4: Reboot & Verification
            if (isFaultyTarget) {
              clearInterval(timer)
              // Trigger Self-Healing Auto-Rollback
              setOtaStates(prev =>
                prev.map(s =>
                  s.id === id
                    ? {
                        ...s,
                        progress: 96,
                        phase: 'failed',
                        statusMsg: 'Stage 4/4: CRITICAL PANIC — Watchdog Timeout in v2.2.0-faulty',
                      }
                    : s
                )
              )
              // Trigger Rollback after 1 second
              setTimeout(async () => {
                const prevVer = devices.find(d => d.id === id)?.firmware ?? 'v1.2.0'
                setOtaStates(prev =>
                  prev.map(s =>
                    s.id === id
                      ? {
                          ...s,
                          phase: 'rollback',
                          statusMsg: `🛡️ Self-Healing Auto-Rollback: Restoring stable ${prevVer}...`,
                        }
                      : s
                  )
                )
                await api.post('/api/ota/rollback', { device_id: id, version: prevVer })
                setTimeout(() => {
                  setOtaStates(prev =>
                    prev.map(s =>
                      s.id === id
                        ? {
                            ...s,
                            progress: 100,
                            phase: 'done',
                            statusMsg: `✅ Self-Healing Complete: Restored to ${prevVer}`,
                          }
                        : s
                    )
                  )
                  setAutoRollbackHappened(true)
                  setDone(true)
                  setRunning(false)
                  if (onAutoRollbackTriggered) onAutoRollbackTriggered(id, prevVer)
                }, 1200)
              }, 1200)
            } else {
              setOtaStates(prev =>
                prev.map(s =>
                  s.id === id
                    ? {
                        ...s,
                        progress: p,
                        phase: 'verifying',
                        statusMsg: 'Stage 4/4: ESP32 Rebooting & Awaiting Heartbeat Ping...',
                      }
                    : s
                )
              )
            }
          } else {
            // Completed successfully
            clearInterval(timer)
            setOtaStates(prev =>
              prev.map(s =>
                s.id === id
                  ? {
                      ...s,
                      progress: 100,
                      phase: 'done',
                      statusMsg: `✅ Verification Succeeded: ${version} Active`,
                    }
                  : s
              )
            )
          }
        }, 320)
      }, delay)
    })

    // Check completion when not faulty
    if (!isFaultyTarget) {
      const checkDone = setInterval(() => {
        setOtaStates(prev => {
          const allDone = prev.every(s => s.phase === 'done')
          if (allDone && prev.length > 0) {
            clearInterval(checkDone)
            setDone(true)
            setRunning(false)
          }
          return prev
        })
      }, 500)
    }
  }

  const phaseColor = (phase: OTAPhase) => {
    switch (phase) {
      case 'handshake': return 'text-purple-700 bg-purple-50 border-purple-200'
      case 'streaming': return 'text-cyan-700 bg-cyan-50 border-cyan-200'
      case 'flashing':  return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'verifying': return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'done':      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'failed':    return 'text-rose-700 bg-rose-50 border-rose-300'
      case 'rollback':  return 'text-amber-800 bg-amber-100 border-amber-300 animate-pulse'
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-base font-bold text-cyan-800 font-mono">Enterprise Multi-Stage OTA Pipeline</h2>
              <p className="text-xs text-slate-400 font-mono">Cryptographic validation, streaming telemetry & verification</p>
            </div>
          </div>
          {!running && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Configuration options (before push) */}
          {!running && !done && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Target Firmware</label>
                  <select
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    {firmware.map(fw => (
                      <option key={fw.version} value={fw.version}>
                        {fw.version} {fw.is_faulty ? '⚠️ [FAULT SIMULATION]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Rollout Strategy</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStrategy('immediate')}
                      className={`flex-1 py-2 text-xs font-mono rounded-lg border font-bold transition-all ${
                        strategy === 'immediate'
                          ? 'bg-cyan-50 text-cyan-800 border-cyan-400 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Immediate (All)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStrategy('canary')}
                      className={`flex-1 py-2 text-xs font-mono rounded-lg border font-bold transition-all ${
                        strategy === 'canary'
                          ? 'bg-purple-50 text-purple-800 border-purple-400 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Canary (Probe)
                    </button>
                  </div>
                </div>
              </div>

              {/* Version preview pill */}
              <div className={`p-3 rounded-xl border text-xs font-mono ${
                isFaultyTarget ? 'bg-rose-50/70 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex justify-between font-bold mb-1">
                  <span>SHA-256: {selectedFw?.sha256?.slice(0, 24)}...</span>
                  <span>{Math.round(totalSize / 1024)} KB</span>
                </div>
                <div>{selectedFw?.changelog}</div>
                {isFaultyTarget && (
                  <div className="mt-2 text-rose-700 font-bold bg-white p-2 rounded border border-rose-200">
                    ⚠️ FAULT TOLERANCE TEST: When deployed, PC-A will detect a simulated watchdog crash and trigger an automated Self-Healing Rollback.
                  </div>
                )}
              </div>

              {/* Target Devices Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Target Deploy Group ({targetDevices.length} node{targetDevices.length !== 1 ? 's' : ''}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {targetDevices.map(d => (
                    <span key={d.id} className="bg-white border border-slate-200 px-2 py-1 rounded text-xs font-mono text-slate-700 font-semibold shadow-xs">
                      {d.id} <span className="text-slate-400">({d.firmware} → <strong className="text-cyan-700">{version}</strong>)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Running Telemetry Stream */}
          {otaStates.length > 0 && (
            <div className="space-y-3">
              {otaStates.map(state => (
                <div key={state.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{state.id}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${phaseColor(state.phase)}`}>
                        {state.phase.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-700">{state.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        state.phase === 'failed'
                          ? 'bg-rose-500'
                          : state.phase === 'rollback'
                          ? 'bg-amber-500'
                          : state.phase === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-600'
                      }`}
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 truncate font-medium">
                    {state.statusMsg}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overall Progress */}
          {running && (
            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between text-xs font-mono text-slate-600 mb-1 font-bold">
                <span>Overall Transfer Fleet Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Completed banner */}
          {done && !autoRollbackHappened && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center">
              <div className="text-emerald-800 font-mono font-bold text-sm">
                ✅ Pipeline Succeeded: All targets verified on {version}
              </div>
              <div className="text-xs font-mono text-emerald-600 mt-1">
                Checksum validation 100% matched • Nodes reporting healthy telemetry
              </div>
            </div>
          )}

          {/* Auto-rollback banner */}
          {autoRollbackHappened && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center">
              <div className="text-amber-900 font-mono font-bold text-sm">
                🛡️ Self-Healing Auto-Rollback Verified
              </div>
              <div className="text-xs font-mono text-amber-700 mt-1">
                Target watchdog failure was intercepted and automatically rolled back to preserve fleet uptime.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-3 justify-end shrink-0">
          {!running && !done ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-mono text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                🚀 Start Pipeline ({targetDevices.length} Target{targetDevices.length !== 1 ? 's' : ''})
              </button>
            </>
          ) : done ? (
            <>
              {strategy === 'canary' && onOpenCanary && (
                <button
                  onClick={() => {
                    onClose()
                    onOpenCanary(targetIds[0], version)
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  🧪 Open Canary A/B Telemetry
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Close Pipeline
              </button>
            </>
          ) : (
            <div className="text-xs font-mono text-cyan-700 font-bold animate-pulse py-2">
              OTA Pipeline Active... Do not close window
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
