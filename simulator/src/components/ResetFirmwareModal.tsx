import React, { useState } from 'react'

const FIRMWARE_VERSIONS = ['v1.0.0', 'v1.1.0', 'v1.2.0']

interface Props {
  currentFirmware: string
  onConfirm: (version: string) => void
  onClose: () => void
}

export function ResetFirmwareModal({ currentFirmware, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(currentFirmware)
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm(selected)
    setConfirming(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-base font-bold text-amber-400 font-mono">↺ Reset Firmware</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs font-mono text-slate-400">
            Current: <span className="text-white font-bold">{currentFirmware}</span>
          </div>

          <div>
            <div className="text-xs font-mono text-slate-400 mb-2">Roll back to:</div>
            <div className="space-y-2">
              {FIRMWARE_VERSIONS.map(v => (
                <label key={v}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected === v
                      ? 'border-amber-600 bg-amber-900/20'
                      : 'border-slate-700 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="version"
                    value={v}
                    checked={selected === v}
                    onChange={() => setSelected(v)}
                    className="accent-amber-500"
                  />
                  <span className="font-mono font-bold text-sm text-slate-200">{v}</span>
                  {v === currentFirmware && (
                    <span className="text-xs text-slate-500 font-mono">(current)</span>
                  )}
                  {v === 'v1.2.0' && v !== currentFirmware && (
                    <span className="text-xs text-cyan-400 font-mono">latest</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg">
            <span className="text-amber-400 mt-0.5">⚠</span>
            <p className="text-xs font-mono text-amber-300">Device will reboot after reset.</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-700">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-300 font-mono text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex-1 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-mono text-sm font-bold transition-colors">
            {confirming ? 'Resetting...' : '↺ Confirm Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}
