import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Device, Group } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'
import { AddDeviceModal } from '../components/AddDeviceModal'
import { api } from '../hooks/useWebSocket'

interface Props {
  devices: Device[]
  groups: Group[]
  onAdd: (d: Device) => void
  onRemove: (id: string) => void
  onRefreshGroups: () => void
}

function DeviceCard({ device, onRemove }: { device: Device; onRemove: (id: string) => void }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
  const isOffline = !device.online

  return (
    <div className={`relative rounded-xl border bg-white flex flex-col items-center p-3 gap-2 transition-all duration-200 hover:shadow-md ${
      isOffline ? 'border-slate-200 bg-slate-50/70 opacity-60' : isUpdating ? 'border-cyan-500 shadow-md shadow-cyan-100' : 'border-slate-200 shadow-xs'
    }`}>
      {/* Delete button */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 text-xs flex items-center justify-center transition-colors font-bold"
        title="Remove device"
      >✕</button>

      {/* Board SVG — pin states intentionally hidden on grid cards (rule: detail views only) */}
      <Esp32Board
        size="sm"
        template={device.template}
        isUpdating={isUpdating}
        isOffline={isOffline}
      />

      {/* OTA progress bar */}
      {isUpdating && (
        <div className="w-full">
          <div className="flex justify-between text-[10px] font-mono text-cyan-700 font-bold mb-0.5">
            <span>FLASHING…</span>
            <span>{device.ota_progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 rounded-full transition-all duration-500"
              style={{ width: `${device.ota_progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Identity */}
      <div className="text-center w-full">
        <div className="font-mono font-bold text-cyan-700 text-sm truncate">{device.id}</div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center justify-center gap-1.5">
          <span>{device.template === 'lcd' ? '🖥 16×2 LCD' : '💡 LED board'}</span>
          <span className="text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-1">{device.group}</span>
        </div>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}/>
        <span className={`text-[11px] font-mono font-bold ${isOffline ? 'text-rose-600' : 'text-emerald-700'}`}>
          {isOffline ? 'OFFLINE' : 'ONLINE'}
        </span>
      </div>

      {/* Open */}
      <button
        onClick={() => navigate(`/device/${device.id}`)}
        className="w-full mt-0.5 py-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-cyan-700 text-xs font-mono font-bold transition-colors shadow-2xs"
      >
        👁 View
      </button>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10 border border-slate-200 shadow-lg p-4">
          <span className="text-sm text-slate-800 font-mono font-bold">Remove {device.id}?</span>
          <div className="flex gap-2">
            <button onClick={() => { onRemove(device.id); setConfirmDelete(false) }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg font-mono font-bold shadow-xs">
              Remove
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-mono font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DeviceGrid({ devices, groups, onAdd, onRemove, onRefreshGroups }: Props) {
  const [showAdd, setShowAdd] = useState(false)

  const handleAdd = async (deviceData: Omit<Device, 'online' | 'uptime' | 'registered_at'>) => {
    try {
      const result = await api.post('/api/devices/register', deviceData)
      onAdd(result as Device)
      setShowAdd(false)
      onRefreshGroups()
    } catch (e) {
      console.error('Device registration failed', e)
    }
  }

  // 4×2 fixed grid that fits a laptop viewport — 8 slots, no scrolling.
  return (
    <main className="p-6 flex justify-center">
      <div className="grid grid-cols-4 grid-rows-2 gap-4 w-full max-w-6xl">
        {devices.slice(0, 7).map(device => (
          <DeviceCard key={device.id} device={device} onRemove={onRemove}/>
        ))}

        {/* Add Device card — always last slot */}
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl border-2 border-dashed border-slate-300 hover:border-cyan-600 bg-white/70 hover:bg-cyan-50/40 flex flex-col items-center justify-center gap-2 p-4 min-h-[190px] transition-all duration-200 group cursor-pointer shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-cyan-100 text-slate-500 group-hover:text-cyan-700 flex items-center justify-center text-xl font-bold transition-colors shadow-2xs">
            +
          </div>
          <div className="text-center">
            <div className="text-slate-800 font-mono font-bold text-sm">Add Device</div>
            <div className="text-slate-400 font-mono text-[10px] mt-0.5">auto-detected on PC-A ✓</div>
          </div>
        </button>
      </div>

      {showAdd && (
        <AddDeviceModal
          groups={groups}
          onConfirm={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </main>
  )
}
