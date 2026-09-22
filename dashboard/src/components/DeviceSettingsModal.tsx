import React, { useState } from 'react'
import type { Device, Group } from '@shared/types'

interface Props {
  device: Device
  groups: Group[]
  onSave: (deviceId: string, data: { name?: string; group?: string; heartbeat_rate?: number }) => Promise<void>
  onClose: () => void
}

export function DeviceSettingsModal({ device, groups, onSave, onClose }: Props) {
  const [name, setName] = useState(device.name || device.id)
  const [group, setGroup] = useState(device.group)
  const [newGroup, setNewGroup] = useState('')
  const [heartbeat, setHeartbeat] = useState(device.heartbeat_rate || 5)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const finalGroup = newGroup.trim() ? newGroup.trim() : group
    await onSave(device.id, {
      name: name.trim() || device.id,
      group: finalGroup,
      heartbeat_rate: Number(heartbeat),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-mono font-bold text-slate-800 text-sm">Device Settings & Initialization</h3>
              <p className="text-xs text-slate-400 font-mono">{device.id} • {device.mac}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">
              Friendly Name / Location Tag
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lab 101 - Primary Sensor"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">
              Fleet Group Assignment
            </label>
            <select
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500 mb-2"
            >
              {groups.map(g => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newGroup}
              onChange={e => setNewGroup(e.target.value)}
              placeholder="Or type a new group name..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-mono font-bold text-slate-600">
                Heartbeat Frequency
              </label>
              <span className="text-xs font-mono text-cyan-700 font-bold">{heartbeat} seconds</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={heartbeat}
              onChange={e => setHeartbeat(Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
              <span>1s (High Traffic)</span>
              <span>30s (Low Power)</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-mono text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
