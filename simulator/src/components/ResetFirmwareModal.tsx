import React, { useState } from 'react'

interface Props {
  currentFirmware: string
  allVersions: string[]
  onConfirm: (version: string) => void
  onClose: () => void
}

export function ResetFirmwareModal({ currentFirmware, allVersions, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(currentFirmware)
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm(selected)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-amber-800 font-mono">↺ Reset Firmware</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs font-mono text-slate-500">
            Current: <span className="text-slate-900 font-bold">{currentFirmware}</span>
          </div>

          <div>
            <div className="text-xs font-mono font-bold text-slate-500 mb-2 uppercase tracking-wider">Roll back to:</div>
            <div className="space-y-2">
              {allVersions.map(v => (
                <label key={v}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected === v
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="version"
                    value={v}
                    checked={selected === v}
                    onChange={() => setSelected(v)}
                    className="accent-amber-600"
                  />
                  <span className="font-mono font-bold text-sm text-slate-800">{v}</span>
                  {v === currentFirmware && (
                    <span className="text-xs text-slate-400 font-mono font-medium">(current)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-600 mt-0.5 text-sm">⚠</span>
            <p className="text-xs font-mono text-amber-900 font-medium">Device will download & flash this version on the next OTA poll (≤5s), then reboot.</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-mono text-sm font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-mono text-sm font-bold shadow-xs transition-colors">
            {confirming ? 'Resetting...' : '↺ Confirm Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}
