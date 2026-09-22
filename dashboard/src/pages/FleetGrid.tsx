import React from 'react'
import type { Device } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'

interface Props {
  devices: Device[]
  groupFilter: string | null
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onOpenDevice: (d: Device) => void
}

function DeviceCard({ device, selected, onToggle, onOpen }: {
  device: Device
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
  const isOffline = !device.online

  return (
    <div
      onClick={onOpen}
      className={`relative rounded-xl border bg-slate-800 cursor-pointer flex flex-col items-center p-4 gap-3
        transition-all duration-200 hover:border-cyan-600 hover:shadow-lg hover:shadow-cyan-900/20
        ${selected ? 'border-cyan-500 ring-1 ring-cyan-500/50' : isOffline ? 'border-slate-700 opacity-60' : isUpdating ? 'border-cyan-500' : 'border-slate-700'}`}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3" onClick={e => { e.stopPropagation(); onToggle() }}>
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          selected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 hover:border-slate-400'
        }`}>
          {selected && <span className="text-white text-xs">✓</span>}
        </div>
      </div>

      <Esp32Board
        size="sm"
        template={device.template}
        isUpdating={isUpdating}
        isOffline={isOffline}
        pins={device.gpio ?? {}}
      />

      {isUpdating && (
        <div className="w-full">
          <div className="flex justify-between text-xs font-mono text-cyan-400 mb-1">
            <span>FLASHING</span><span>{device.ota_progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                 style={{ width: `${device.ota_progress}%` }}/>
          </div>
        </div>
      )}

      <div className="text-center w-full">
        <div className="font-mono font-bold text-cyan-400 text-sm truncate">{device.id}</div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`}/>
          <span className={`text-xs font-mono ${isOffline ? 'text-red-400' : 'text-green-400'}`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className="text-lg">{device.template === 'lcd' ? '🖥' : '💡'}</span>
          <span className="text-xs text-slate-400 font-mono">{device.template === 'lcd' ? '16×2 LCD' : '2-LED'}</span>
        </div>
        <div className="flex justify-center gap-2 mt-1 text-xs font-mono">
          <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">{device.firmware}</span>
          <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{device.group}</span>
        </div>
        {!isOffline && (
          <div className="text-xs text-slate-600 font-mono mt-1">
            up: {Math.floor((device.uptime ?? 0) / 3600)}h {Math.floor(((device.uptime ?? 0) % 3600) / 60)}m
          </div>
        )}
      </div>
    </div>
  )
}

export function FleetGrid({ devices, groupFilter, selectedIds, onToggleSelect, onToggleAll, onOpenDevice }: Props) {
  const filtered = groupFilter ? devices.filter(d => d.group === groupFilter) : devices

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-slate-300 font-semibold">
            {groupFilter ? groupFilter : 'All Devices'} ({filtered.length})
          </h2>
          {filtered.length > 0 && (
            <button onClick={onToggleAll}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
              {selectedIds.size === devices.length ? '☐ Deselect All' : '☑ Select All'}
            </button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <span className="text-xs font-mono text-cyan-400 bg-cyan-900/30 border border-cyan-800 px-2 py-1 rounded">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(d => (
          <DeviceCard
            key={d.id}
            device={d}
            selected={selectedIds.has(d.id)}
            onToggle={() => onToggleSelect(d.id)}
            onOpen={() => onOpenDevice(d)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-4 py-16 text-center text-slate-600 font-mono">
            No devices in this group. Add devices from PC-B.
          </div>
        )}
      </div>
    </div>
  )
}
