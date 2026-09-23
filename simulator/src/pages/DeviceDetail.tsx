import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Device } from '@shared/types'
import { LedWiringDiagram, LcdWiringDiagram, type Pin } from '@shared/components'
import { getSimControls } from '../hooks/useDeviceSimulator'

interface Props {
  devices: Device[]
}

export function DeviceDetail({ devices }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [confirmPower, setConfirmPower] = useState(false)

  const device = devices.find(d => d.id === id)
  const controls = getSimControls(id ?? '')

  // The running firmware's source, fetched live so a pushed update is visible.
  // Re-fetches whenever the device's firmware version changes (OTA completed).
  useEffect(() => {
    if (!showCode || !device) return
    let cancelled = false
    setCodeLoading(true)
    fetch(`${import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'}/api/firmware/${device.firmware}/code`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setCode(res.code ?? '// Source not available') })
      .catch(() => { if (!cancelled) setCode('// Failed to load source') })
      .finally(() => { if (!cancelled) setCodeLoading(false) })
    return () => { cancelled = true }
  }, [showCode, device?.firmware])

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
  const lcd = device.lcd ?? { row1: '', row2: '' }
  const isOffline = !device.online
  const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
  const wiredPins = (['D0', 'D1', 'D2', 'D3'] as Pin[]).slice(0, Math.max(1, device.led_count ?? 4))

  const togglePower = async () => {
    const next = !device.online
    setConfirmPower(false)
    controls?.setOnline(next)
    try {
      await api_status(device.id, next)
    } catch { /* local sim state is authoritative for the UI */ }
  }

  return (
    <div className="p-5 flex justify-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header: identity + power + code */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-slate-700 text-sm font-mono font-bold"
                title="Back to grid"
              >←</button>
              <h1 className="font-mono font-bold text-cyan-700 text-lg truncate">{device.id}</h1>
            </div>
            <div className="flex items-center gap-3 mt-1 ml-6">
              <span className={`flex items-center gap-1.5 text-xs font-mono font-bold ${isOffline ? 'text-rose-600' : 'text-emerald-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                {isOffline ? 'OFFLINE' : 'ONLINE'}
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {device.firmware}
              </span>
              {device.ota_state === 'failed' && (
                <span className="text-[11px] font-mono text-red-700 font-bold animate-pulse">
                  UPDATE FAILED — RETRYING…
                </span>
              )}
              {isUpdating && (
                <span className="text-[11px] font-mono text-cyan-700 font-bold animate-pulse">
                  FLASHING {device.ota_progress}%
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCode(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-cyan-700 text-xs font-mono font-bold transition-colors"
              title="View running firmware source"
            >
              {'</>'} View Code
            </button>
            <button
              onClick={() => setConfirmPower(true)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-colors ${
                device.online
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
              }`}
              title={device.online ? 'Power off' : 'Power on'}
            >
              ⏻ {device.online ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Cross-template firmware — device won't boot */}
        {device.ota_state === 'incompatible' && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-red-700">
            ⚠ DEVICE NOT COMPATIBLE / NO RESPONSE — the pushed firmware does not match this hardware. Power-cycle to recover.
          </div>
        )}

        {/* Wiring diagram with live HIGH/LOW + live LCD text */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4">
          {device.template === 'lcd' ? (
            <LcdWiringDiagram row1={lcd.row1} row2={lcd.row2} online={!isOffline} />
          ) : (
            <LedWiringDiagram gpio={gpio} wiredPins={wiredPins} online={!isOffline} />
          )}
        </div>
      </div>

      {/* Power confirm */}
      {confirmPower && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 w-full max-w-xs text-center space-y-3">
            <p className="font-mono text-sm font-bold text-slate-900">
              {device.online ? 'Power off' : 'Power on'} {device.id}?
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {device.online
                ? 'The device disconnects from PC-A and stops responding.'
                : 'The device reconnects to PC-A and resumes.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmPower(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-mono font-bold">
                Cancel
              </button>
              <button onClick={togglePower}
                className={`flex-1 py-2 text-white text-xs rounded-lg font-mono font-bold ${device.online ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {device.online ? 'Power Off' : 'Power On'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code viewer — shows the sketch actually running on this device */}
      {showCode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <h3 className="font-mono font-bold text-slate-900 text-sm">
                  {'</>'} Running firmware — <span className="text-cyan-700">{device.firmware}</span>
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {isUpdating ? '⇣ update in progress…' : 'live from PC-A firmware repository'}
                </p>
              </div>
              <button onClick={() => setShowCode(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <pre className="flex-1 overflow-auto bg-slate-900 text-emerald-100 font-mono text-[11px] leading-relaxed p-4 m-0 whitespace-pre">
              {codeLoading ? 'Loading source…' : (code ?? '// Source not available')}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

async function api_status(deviceId: string, online: boolean) {
  const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
  await fetch(`${base}/api/devices/${deviceId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ online }),
  })
}
