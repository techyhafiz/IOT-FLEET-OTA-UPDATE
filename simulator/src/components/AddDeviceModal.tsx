import React, { useState } from 'react'
import type { Device, Group } from '@shared/types'
import { LedWiringDiagram, LcdWiringDiagram } from '@shared/components'

const genId = () => {
  const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')
  return `ESP-${hex()}${hex()}`
}

const BASE_FW = { led: 'v1.9.0', lcd: 'v3.8.0' }

interface Props {
  groups: Group[]
  onConfirm: (d: Omit<Device, 'online' | 'uptime' | 'registered_at'>) => void
  onClose: () => void
}

export function AddDeviceModal({ groups, onConfirm, onClose }: Props) {
  const [deviceId, setDeviceId] = useState(genId)
  const [group, setGroup] = useState(groups[0]?.name ?? 'floor-1')
  const [hardware, setHardware] = useState<'led' | 'lcd'>('led')
  const [ledCount, setLedCount] = useState(3)
  const [saving, setSaving] = useState(false)

  const macFromId = (id: string) =>
    id.replace('ESP-', '').match(/.{1,2}/g)?.join(':').concat(':00:11:22:33') ?? '00:00:00:00:00:00'

  const wiredPins = (['D0', 'D1', 'D2', 'D3'] as const).slice(0, ledCount)

  async function handleConfirm() {
    setSaving(true)
    await onConfirm({
      id: deviceId,
      mac: macFromId(deviceId),
      firmware: BASE_FW[hardware], // boots the pure OTA-platform build
      group,
      template: hardware,
      led_count: hardware === 'led' ? ledCount : 0,
      gpio: { D0: 0, D1: 0, D2: 0, D3: 0 } as { D0: 0; D1: 0; D2: 0; D3: 0 },
      lcd: hardware === 'lcd' ? { row1: '', row2: '' } : undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-cyan-700 font-mono">➕ Add Device</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Device ID + group */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">Device ID</label>
              <div className="flex gap-1.5">
                <input
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-cyan-700 font-bold focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => setDeviceId(genId())}
                  className="px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 text-xs font-mono font-bold transition-colors"
                  title="Regenerate ID"
                >↺</button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">Group</label>
              <select
                value={group}
                onChange={e => setGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-700 focus:outline-none focus:border-cyan-500"
              >
                {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                {!groups.find(g => g.name === 'floor-1') && <option value="floor-1">floor-1</option>}
              </select>
            </div>
          </div>

          {/* Hardware picker */}
          <div>
            <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">External Hardware</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHardware('led')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  hardware === 'led'
                    ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-200'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-900">LED Board</p>
                    <p className="text-[10px] text-slate-500">D0 – D3 GPIO outputs</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setHardware('lcd')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  hardware === 'lcd'
                    ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-200'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖥</span>
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-900">16×2 LCD</p>
                    <p className="text-[10px] text-slate-500">I2C · addr 0x27</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* LED count */}
          {hardware === 'led' && (
            <div>
              <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">LEDs Wired</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLedCount(n)}
                    className={`flex-1 py-2 rounded-lg border font-mono text-xs font-bold transition-all ${
                      ledCount === n
                        ? 'bg-cyan-600 text-white border-cyan-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {n} LED{n > 1 ? 's' : ''}
                    <span className="block text-[9px] font-normal opacity-80">
                      D0{ledCount > 1 ? `–D${n - 1}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wiring preview */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
              Wiring Diagram
            </p>
            {hardware === 'led' ? (
              <LedWiringDiagram
                gpio={{ D0: 0, D1: 0, D2: 0, D3: 0 }}
                wiredPins={wiredPins}
              />
            ) : (
              <LcdWiringDiagram row1="" row2="" />
            )}
          </div>

          <p className="text-[11px] text-slate-500 font-mono">
            Boots the base OTA-platform build ({BASE_FW[hardware]}) — everything OFF/blank. Firmware is pushed from PC-A.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !deviceId.trim()}
            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors"
          >
            {saving ? 'Registering...' : 'Add & Register'}
          </button>
        </div>
      </div>
    </div>
  )
}
