import React from 'react'
import type { Device, FirmwareVersion, LogEntry } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'

interface Props {
  devices: Device[]
  firmware: FirmwareVersion[]
  logs: LogEntry[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onOpenDevice: (d: Device) => void
  onOpenUpdateModal: () => void
}

const PIE_COLORS = ['#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']

export function FleetGrid({
  devices,
  firmware,
  logs,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onOpenDevice,
  onOpenUpdateModal,
}: Props) {
  const total = devices.length
  const onlineCount = devices.filter(d => d.online).length
  const latestFw = firmware[0]?.version || 'v1.2.0'

  // Version counts for the Pie / Donut Chart
  const versionCounts: Record<string, number> = {}
  devices.forEach(d => {
    versionCounts[d.firmware] = (versionCounts[d.firmware] || 0) + 1
  })

  const versionEntries = Object.entries(versionCounts)
  let cumulativePercent = 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── 1. TOP STATS CARDS & PIE CHART ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat Card 1: Total Devices */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Fleet Nodes
            </span>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{total}</div>
            <span className="text-[11px] font-mono text-cyan-700 font-semibold">ESP32 DevKit V1</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center text-lg font-bold">
            📡
          </div>
        </div>

        {/* Stat Card 2: Connectivity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Connectivity
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <span>{onlineCount}</span>
              <span className="text-xs text-slate-400 font-normal">/ {total}</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Heartbeat
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-lg font-bold">
            🔌
          </div>
        </div>

        {/* Stat Card 3: Target Firmware */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Target Release
            </span>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{latestFw}</div>
            <span className="text-[11px] font-mono text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Active Fleet Target
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-bold">
            📦
          </div>
        </div>

        {/* Stat Card 4: Compact Firmware Distribution Donut / Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          {/* Donut SVG */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 42 42" className="w-16 h-16 transform -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="6"
              />
              {versionEntries.map(([ver, count], i) => {
                const percent = total > 0 ? (count / total) * 100 : 0
                const strokeDasharray = `${percent} ${100 - percent}`
                const strokeDashoffset = -cumulativePercent
                cumulativePercent += percent
                return (
                  <circle
                    key={ver}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={PIE_COLORS[i % PIE_COLORS.length]}
                    strokeWidth="6"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                )
              })}
            </svg>
            <span className="absolute font-mono text-[10px] font-bold text-slate-700">FW</span>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1 font-mono text-[11px] overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              FW Breakdown
            </span>
            {versionEntries.slice(0, 3).map(([ver, count], i) => (
              <div key={ver} className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate">{ver}</span>
                </span>
                <span className="font-bold text-slate-800 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 2. DEVICE FLEET HEADER & ACTION BAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h3 className="font-mono text-slate-900 font-bold text-base">Connected Devices</h3>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
            {devices.length}
          </span>
          <button
            onClick={onToggleAll}
            className="text-xs font-mono text-slate-500 hover:text-slate-800 transition-colors underline decoration-slate-300"
          >
            {selectedIds.size === devices.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Primary Action Button: Update Firmware */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-sm"
          >
            <span>⚡</span> Update Firmware {selectedIds.size > 0 ? `(${selectedIds.size} selected)` : ''}
          </button>
        </div>
      </div>

      {/* ─── 3. CLEAN DEVICE CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map(device => {
          const isSelected = selectedIds.has(device.id)
          const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
          const isOffline = !device.online
          const isLcd = device.template === 'lcd'

          return (
            <div
              key={device.id}
              onClick={() => onOpenDevice(device)}
              className={`rounded-2xl border bg-white cursor-pointer p-4 space-y-3 transition-all duration-150 hover:shadow-md ${
                isSelected
                  ? 'border-cyan-500 ring-2 ring-cyan-200 shadow-xs'
                  : isOffline
                  ? 'border-slate-200 bg-slate-50/70 opacity-70'
                  : 'border-slate-200 shadow-2xs hover:border-slate-300'
              }`}
            >
              {/* Card Top: Checkbox, Name, Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(device.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{device.id}</span>
                    {device.name && device.name !== device.id && (
                      <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">{device.name}</span>
                    )}
                  </div>
                </div>

                {/* Status Symbol (Online / Offline) */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                  isOffline
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  {isOffline ? 'Offline' : 'Online'}
                </span>
              </div>

              {/* Hardware Board Graphic Display */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 flex justify-center items-center">
                <Esp32Board
                  size="sm"
                  template={device.template}
                  isUpdating={isUpdating}
                  isOffline={isOffline}
                  pins={device.gpio ?? {}}
                />
              </div>

              {/* Progress bar if updating */}
              {isUpdating && (
                <div className="space-y-1 bg-cyan-50 border border-cyan-200 p-2 rounded-lg">
                  <div className="flex justify-between text-[10px] font-mono text-cyan-800 font-bold">
                    <span>FLASHING FIRMWARE</span>
                    <span>{device.ota_progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-cyan-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                      style={{ width: `${device.ota_progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Details Row: Current FW & Type */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span>{isLcd ? '🖥️ LCD' : '💡 LED'}</span>
                  <span>•</span>
                  <span>{device.group}</span>
                </div>
                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {device.firmware}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 4. BOTTOM CLEAN TABLE: LIVE LOGS & UPDATE STATUS ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h4 className="font-mono font-bold text-slate-900 text-xs uppercase tracking-wider">
              Live Device Activity & Telemetry Logs
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Real-time WebSocket stream (showing last {Math.min(logs.length, 10)})
          </span>
        </div>

        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Device</th>
                <th className="py-2.5 px-4">Level</th>
                <th className="py-2.5 px-4">Telemetry Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.slice(-10).reverse().map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="py-2 px-4 font-bold text-slate-800 text-[11px]">
                    {entry.device_id}
                  </td>
                  <td className="py-2 px-4">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      entry.level === 'ERROR'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : entry.level === 'WARN'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {entry.level}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-700 text-[11px]">
                    {entry.msg}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 font-mono text-xs">
                    Listening for incoming device telemetry logs...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
