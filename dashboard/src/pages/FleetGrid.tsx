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
      className={`relative rounded-xl border bg-white cursor-pointer flex flex-col items-center p-4 gap-3
        transition-all duration-200 hover:border-cyan-500 hover:shadow-md
        ${selected ? 'border-cyan-500 ring-2 ring-cyan-200 shadow-xs' : isOffline ? 'border-slate-200 bg-slate-50/60 opacity-60' : isUpdating ? 'border-cyan-500 shadow-md shadow-cyan-100' : 'border-slate-200 shadow-xs'}`}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3" onClick={e => { e.stopPropagation(); onToggle() }}>
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          selected ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}>
          {selected && <span className="text-white text-xs font-bold">✓</span>}
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
          <div className="flex justify-between text-xs font-mono text-cyan-700 font-bold mb-1">
            <span>FLASHING</span><span>{device.ota_progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                 style={{ width: `${device.ota_progress}%` }}/>
          </div>
        </div>
      )}

      <div className="text-center w-full">
        <div className="font-mono font-bold text-cyan-700 text-sm truncate">{device.id}</div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}/>
          <span className={`text-xs font-mono font-semibold ${isOffline ? 'text-rose-600' : 'text-emerald-700'}`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className="text-base">{device.template === 'lcd' ? '🖥' : '💡'}</span>
          <span className="text-xs text-slate-600 font-mono font-medium">{device.template === 'lcd' ? '16×2 LCD' : '2-LED'}</span>
        </div>
        <div className="flex justify-center gap-2 mt-1.5 text-xs font-mono">
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">{device.firmware}</span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-medium">{device.group}</span>
        </div>
        {!isOffline && (
          <div className="text-[11px] text-slate-400 font-mono mt-1">
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
          <h2 className="font-mono text-slate-800 font-bold text-base">
            {groupFilter ? groupFilter : 'All Devices'} ({filtered.length})
          </h2>
          {filtered.length > 0 && (
            <button onClick={onToggleAll}
              className="text-xs font-mono text-slate-500 hover:text-slate-800 transition-colors">
              {selectedIds.size === devices.length ? '☐ Deselect All' : '☑ Select All'}
            </button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <span className="text-xs font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-md font-bold">
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
          <div className="col-span-4 py-16 text-center text-slate-400 font-mono">
            No devices in this group. Add devices from PC-B.
          </div>
        )}
      </div>
    </div>
  )
}
