import React, { useState } from 'react'
import type { Device, Group } from '@shared/types'

const TEMPLATES = [
  {
    id: 'led' as const,
    icon: '💡',
    name: '2-LED Controller',
    desc: 'D0 → LED 1  ·  D1 → LED 2',
    sub: 'Digital GPIO outputs',
  },
  {
    id: 'lcd' as const,
    icon: '🖥',
    name: '16×2 LCD Display',
    desc: 'I2C LCD simulation',
    sub: '16×2 character screen',
  },
]

const FIRMWARE_OPTIONS = ['v1.0.0', 'v1.1.0', 'v1.2.0']

function genId() {
  const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')
  return `ESP-${hex()}${hex()}`
}

interface Props {
  groups: Group[]
  onConfirm: (d: Omit<Device, 'online' | 'uptime' | 'registered_at'>) => void
  onClose: () => void
}

export function AddDeviceModal({ groups, onConfirm, onClose }: Props) {
  const [deviceId, setDeviceId] = useState(genId)
  const [group, setGroup] = useState(groups[0]?.name ?? 'floor-1')
  const [firmware, setFirmware] = useState('v1.0.0')
  const [template, setTemplate] = useState<'led' | 'lcd'>('led')
  const [saving, setSaving] = useState(false)

  const macFromId = (id: string) =>
    id.replace('ESP-', '').match(/.{1,2}/g)?.join(':').concat(':00:11:22:33') ?? '00:00:00:00:00:00'

  async function handleConfirm() {
    setSaving(true)
    await onConfirm({
      id: deviceId,
      mac: macFromId(deviceId),
      firmware,
      group,
      template,
      gpio: { D0: 0, D1: 0, D2: 0, D3: 0 },
      lcd: template === 'lcd' ? { row1: 'Hello World!', row2: 'Sys: RUNNING' } : undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-cyan-700 font-mono">➕ Add New Device</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Device ID */}
          <div>
            <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">Device ID</label>
            <div className="flex gap-2">
              <input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-cyan-700 font-bold focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setDeviceId(genId())}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 text-xs font-mono font-bold transition-colors"
                title="Regenerate ID"
              >↺</button>
            </div>
          </div>

          {/* Group + Firmware row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">Group</label>
              <select
                value={group}
                onChange={e => setGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                {groups.map(g => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono font-bold mb-1.5 uppercase tracking-wider">Firmware</label>
              <select
                value={firmware}
                onChange={e => setFirmware(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                {FIRMWARE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Template picker */}
          <div>
            <label className="block text-xs text-slate-500 font-mono font-bold mb-2 uppercase tracking-wider">Choose Template</label>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                    template === t.id
                      ? 'border-cyan-600 bg-cyan-50 ring-2 ring-cyan-200 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className={`font-mono font-bold text-sm ${template === t.id ? 'text-cyan-800' : 'text-slate-800'}`}>
                    {t.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1 font-medium">{t.desc}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{t.sub}</div>
                  {template === t.id && (
                    <div className="mt-2 text-xs text-cyan-700 font-mono font-bold">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-mono text-sm font-semibold transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !deviceId}
            className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-mono text-sm font-bold shadow-xs transition-colors"
          >
            {saving ? 'Registering...' : '✅ Add & Register'}
          </button>
        </div>
      </div>
    </div>
  )
}
