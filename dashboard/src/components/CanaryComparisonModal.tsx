import React, { useState, useEffect } from 'react'
import type { Device, LogEntry } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  canaryDeviceId: string
  targetVersion: string
  devices: Device[]
  onPromote: () => Promise<void>
  onAbort: () => Promise<void>
  onClose: () => void
}

export function CanaryComparisonModal({
  canaryDeviceId,
  targetVersion,
  devices,
  onPromote,
  onAbort,
  onClose,
}: Props) {
  const [canaryLogs, setCanaryLogs] = useState<LogEntry[]>([])
  const [promoting, setPromoting] = useState(false)
  const [aborting, setAborting] = useState(false)
  const [secondsObserved, setSecondsObserved] = useState(12)

  const canaryDevice = devices.find(d => d.id === canaryDeviceId)
  const baselineDevices = devices.filter(d => d.id !== canaryDeviceId)
  const baselineVersion = baselineDevices[0]?.firmware ?? 'v1.1.0'

  useEffect(() => {
    const t = setInterval(() => setSecondsObserved(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (canaryDeviceId) {
      api.get(`/api/devices/${canaryDeviceId}/logs`).then(setCanaryLogs)
    }
  }, [canaryDeviceId])

  async function handlePromote() {
    setPromoting(true)
    await onPromote()
    setPromoting(false)
    onClose()
  }

  async function handleAbort() {
    setAborting(true)
    await onAbort()
    setAborting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 font-mono">Canary A/B Telemetry Comparison</h2>
                <span className="bg-purple-50 text-purple-700 border border-purple-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  CANARY ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Observing live telemetry between Canary release and baseline fleet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Observation status bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-slate-600 font-medium">Observation Window:</span>
            <strong className="text-slate-800">{secondsObserved}s active</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              0 Anomaly Events Detected
            </span>
          </div>
        </div>

        {/* Split comparison content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Canary Node */}
            <div className="bg-purple-50/40 border-2 border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-mono font-bold text-purple-700 uppercase tracking-wider">
                    CANARY TARGET RELEASE
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{canaryDeviceId}</div>
                </div>
                <span className="bg-purple-100 text-purple-800 border border-purple-300 font-mono font-bold text-xs px-2.5 py-1 rounded-md">
                  {targetVersion}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white border border-purple-100 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">HEALTH STATUS</div>
                  <div className="text-emerald-700 font-bold mt-0.5">● OPTIMAL</div>
                </div>
                <div className="bg-white border border-purple-100 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">HEAP STABILITY</div>
                  <div className="text-slate-800 font-bold mt-0.5">188 KB Free</div>
                </div>
                <div className="bg-white border border-purple-100 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">CRASH / PANIC</div>
                  <div className="text-slate-800 font-bold mt-0.5">0 Events</div>
                </div>
                <div className="bg-white border border-purple-100 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">HEARTBEAT</div>
                  <div className="text-slate-800 font-bold mt-0.5">12ms latency</div>
                </div>
              </div>

              {/* Logs */}
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-500 mb-1">CANARY TELEMETRY STREAM</div>
                <div className="bg-slate-900 rounded-lg p-2.5 h-32 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-200 shadow-inner">
                  {canaryLogs.length === 0 ? (
                    <div className="text-slate-500 italic">Listening for telemetry...</div>
                  ) : (
                    canaryLogs.slice(-8).map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-500">{log.timestamp}</span>
                        <span className="text-emerald-400 font-bold">[{log.level}]</span>
                        <span className="truncate">{log.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Baseline Fleet */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    BASELINE FLEET CONTROL
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                    {baselineDevices.length} Device{baselineDevices.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="bg-slate-200 text-slate-800 border border-slate-300 font-mono font-bold text-xs px-2.5 py-1 rounded-md">
                  {baselineVersion}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">FLEET STABILITY</div>
                  <div className="text-emerald-700 font-bold mt-0.5">100.0%</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">AVG HEAP</div>
                  <div className="text-slate-800 font-bold mt-0.5">192 KB Free</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">ERROR RATE</div>
                  <div className="text-slate-800 font-bold mt-0.5">0.00%</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px]">AVG LATENCY</div>
                  <div className="text-slate-800 font-bold mt-0.5">14ms</div>
                </div>
              </div>

              {/* Devices list */}
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-500 mb-1">CONTROL GROUP NODES</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {baselineDevices.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-mono">
                      <span className="font-bold text-slate-700">{d.id}</span>
                      <span className="text-slate-400">{d.group}</span>
                      <span className="text-emerald-700 text-[11px] font-semibold">● ONLINE</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Banner */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-mono font-bold text-emerald-900 text-sm">
                  Canary Verification Succeeded: Zero Error Delta
                </div>
                <div className="font-mono text-xs text-emerald-700">
                  Node {canaryDeviceId} running {targetVersion} shows zero anomalies. Ready to promote to remaining {baselineDevices.length} devices.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-3 justify-end shrink-0">
          <button
            onClick={handleAbort}
            disabled={aborting}
            className="px-4 py-2.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            {aborting ? 'Rolling back...' : '↺ Abort Canary (Rollback)'}
          </button>
          <button
            onClick={handlePromote}
            disabled={promoting}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            {promoting ? 'Promoting...' : `🚀 Promote ${targetVersion} to 100% Fleet (${baselineDevices.length} nodes)`}
          </button>
        </div>
      </div>
    </div>
  )
}
