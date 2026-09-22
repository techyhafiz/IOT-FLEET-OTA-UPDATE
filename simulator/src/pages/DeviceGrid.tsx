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
    <div className={`relative rounded-xl border bg-slate-800 flex flex-col items-center p-4 gap-3 transition-all duration-300 hover:border-cyan-600 ${
      isOffline ? 'border-slate-700 opacity-60' : isUpdating ? 'border-cyan-500 shadow-lg shadow-cyan-900/40' : 'border-slate-700'
    }`}>
      {/* Delete button */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-700 hover:bg-red-800 text-slate-400 hover:text-red-300 text-xs flex items-center justify-center transition-colors"
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
          <div className="flex justify-between text-xs font-mono text-cyan-400 mb-1">
            <span>FLASHING...</span>
            <span>{device.ota_progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${device.ota_progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Device info */}
      <div className="text-center w-full">
        <div className="font-mono font-bold text-cyan-400 text-sm truncate">{device.id}</div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-lg">{device.template === 'lcd' ? '🖥' : '💡'}</span>
          <span className="text-xs text-slate-400">{device.template === 'lcd' ? '16×2 LCD' : '2-LED Ctrl'}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`}/>
          <span className={`text-xs font-mono ${isOffline ? 'text-red-400' : 'text-green-400'}`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
          <span className="bg-slate-700 px-1.5 py-0.5 rounded">{device.firmware}</span>
          <span className="bg-slate-700 px-1.5 py-0.5 rounded">{device.group}</span>
        </div>
        {!isOffline && (
          <div className="text-xs text-slate-600 font-mono mt-1">
            up: {Math.floor((device.uptime ?? 0) / 3600)}h {Math.floor(((device.uptime ?? 0) % 3600) / 60)}m
          </div>
        )}
        {isOffline && (
          <div className="text-xs text-slate-600 font-mono mt-1">Last seen: recently</div>
        )}
      </div>

      {/* Open button */}
      <button
        onClick={() => navigate(`/device/${device.id}`)}
        className="w-full mt-1 py-1.5 rounded-lg bg-slate-700 hover:bg-cyan-900/50 border border-slate-600 hover:border-cyan-600 text-cyan-400 text-xs font-mono transition-colors"
      >
        👁 Open Device
      </button>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-slate-900/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10">
          <span className="text-sm text-slate-300 font-mono">Delete {device.id}?</span>
          <div className="flex gap-2">
            <button onClick={() => { onRemove(device.id); setConfirmDelete(false) }}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-xs rounded font-mono">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded font-mono">
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
          className="rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-600 bg-slate-800/50 hover:bg-cyan-900/10 flex flex-col items-center justify-center gap-3 p-8 min-h-[280px] transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-700 group-hover:bg-cyan-900/50 flex items-center justify-center text-2xl transition-colors">
            +
          </div>
          <div className="text-center">
            <div className="text-slate-300 font-mono font-semibold text-sm">Add Device</div>
            <div className="text-slate-600 font-mono text-xs mt-1">Pick a template & spawn</div>
            <div className="text-slate-600 font-mono text-xs">auto-registers on PC-A ✓</div>
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
