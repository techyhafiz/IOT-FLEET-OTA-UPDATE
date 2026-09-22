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
    <div className={`relative rounded-xl border bg-white flex flex-col items-center p-4 gap-3 transition-all duration-200 hover:border-cyan-500 hover:shadow-md ${
      isOffline ? 'border-slate-200 bg-slate-50/70 opacity-60' : isUpdating ? 'border-cyan-500 shadow-md shadow-cyan-100' : 'border-slate-200 shadow-xs'
    }`}>
      {/* Delete button */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 text-xs flex items-center justify-center transition-colors font-bold"
        title="Delete device"
      >✕</button>

      {/* Board SVG */}
      <Esp32Board
        size="sm"
        template={device.template}
        isUpdating={isUpdating}
        isOffline={isOffline}
        pins={device.gpio ? {
          D0: device.gpio.D0,
          D1: device.gpio.D1,
          D2: device.gpio.D2,
          D3: device.gpio.D3,
        } : {}}
      />

      {/* OTA progress bar */}
      {isUpdating && (
        <div className="w-full">
          <div className="flex justify-between text-xs font-mono text-cyan-700 font-bold mb-1">
            <span>FLASHING...</span>
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

      {/* Device info */}
      <div className="text-center w-full">
        <div className="font-mono font-bold text-cyan-700 text-sm truncate">{device.id}</div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-base">{device.template === 'lcd' ? '🖥' : '💡'}</span>
          <span className="text-xs text-slate-600 font-mono font-medium">{device.template === 'lcd' ? '16×2 LCD' : '2-LED Ctrl'}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}/>
          <span className={`text-xs font-mono font-semibold ${isOffline ? 'text-rose-600' : 'text-emerald-700'}`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-mono">
          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{device.firmware}</span>
          <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-medium">{device.group}</span>
        </div>
        {!isOffline && (
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            up: {Math.floor((device.uptime ?? 0) / 3600)}h {Math.floor(((device.uptime ?? 0) % 3600) / 60)}m
          </div>
        )}
        {isOffline && (
          <div className="text-[11px] text-slate-400 font-mono mt-1">Last seen: recently</div>
        )}
      </div>

      {/* Open button */}
      <button
        onClick={() => navigate(`/device/${device.id}`)}
        className="w-full mt-1 py-2 rounded-lg bg-slate-100 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-cyan-700 text-xs font-mono font-bold transition-colors shadow-2xs"
      >
        👁 Open Device
      </button>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10 border border-slate-200 shadow-lg p-4">
          <span className="text-sm text-slate-800 font-mono font-bold">Delete {device.id}?</span>
          <div className="flex gap-2">
            <button onClick={() => { onRemove(device.id); setConfirmDelete(false) }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg font-mono font-bold shadow-xs">
              Delete
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
    const result = await api.post('/api/devices/register', deviceData)
    onAdd(result as Device)
    setShowAdd(false)
    onRefreshGroups()
  }

  return (
    <main className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map(device => (
          <DeviceCard key={device.id} device={device} onRemove={onRemove}/>
        ))}

        {/* Add Device card */}
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl border-2 border-dashed border-slate-300 hover:border-cyan-600 bg-white/70 hover:bg-cyan-50/40 flex flex-col items-center justify-center gap-3 p-8 min-h-[280px] transition-all duration-200 group cursor-pointer shadow-xs"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-cyan-100 text-slate-500 group-hover:text-cyan-700 flex items-center justify-center text-2xl font-bold transition-colors shadow-2xs">
            +
          </div>
          <div className="text-center">
            <div className="text-slate-800 font-mono font-bold text-sm">Add Device</div>
            <div className="text-slate-500 font-mono text-xs mt-1">Pick a template & spawn</div>
            <div className="text-slate-400 font-mono text-xs">auto-registers on PC-A ✓</div>
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
