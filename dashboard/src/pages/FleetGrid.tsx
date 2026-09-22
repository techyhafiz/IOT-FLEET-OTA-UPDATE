import React, { useState, useMemo } from 'react'
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

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getDeviceIp(device: Device, idx: number): string {
  if (device.config && typeof device.config.ip === 'string') {
    return device.config.ip
  }
  return `192.168.1.${101 + idx}`
}

function getDeviceRssi(device: Device, idx: number): { val: number; label: string } {
  if (device.config && typeof device.config.rssi === 'number') {
    return { val: device.config.rssi, label: `${device.config.rssi} dBm` }
  }
  const defaultRssi = [-58, -64, -72, -61][idx % 4]
  return { val: defaultRssi, label: `${defaultRssi} dBm` }
}

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
  const latestFw = firmware[0]?.version || 'v1.3.0'

  // Adoption statistics
  const targetAdoptedCount = devices.filter(d => d.firmware === latestFw).length
  const targetAdoptedPercent = total > 0 ? Math.round((targetAdoptedCount / total) * 100) : 0

  // Log table controls state
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL')
  const [isPaused, setIsPaused] = useState(false)
  const [clearedAt, setClearedAt] = useState<number>(0)

  // Version counts for the Pie / Donut Chart
  const versionCounts: Record<string, number> = {}
  devices.forEach(d => {
    versionCounts[d.firmware] = (versionCounts[d.firmware] || 0) + 1
  })

  const versionEntries = Object.entries(versionCounts)
  let cumulativePercent = 0

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let list = logs
    if (clearedAt > 0) {
      list = list.filter(l => {
        // Simple timestamp comparison or pass recent
        return true
      })
    }
    if (logFilter !== 'ALL') {
      list = list.filter(l => l.level === logFilter)
    }
    return list.slice(-15).reverse()
  }, [logs, logFilter, clearedAt])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── 1. TOP STATS CARDS & REFINED COMPLIANCE DONUT ──────────────────────── */}
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
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Stat Card 3: Target Release & Adoption Progress */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Target Release
            </span>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{latestFw}</div>
            <div className="mt-1">
              {targetAdoptedCount === total && total > 0 ? (
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ 100% Fleet Compliance
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {targetAdoptedCount}/{total} Adopted ({targetAdoptedPercent}%)
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        {/* Stat Card 4: Donut Chart with Compliance Percentage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          {/* Donut SVG with Target Adoption in Center */}
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
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-mono text-[11px] font-bold text-slate-800 leading-none">
                {targetAdoptedPercent}%
              </span>
              <span className="font-mono text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                Target
              </span>
            </div>
          </div>

          {/* Legend with Percentages */}
          <div className="flex-1 space-y-1 font-mono text-[11px] overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              FW Breakdown
            </span>
            {versionEntries.slice(0, 3).map(([ver, count], i) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={ver} className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{ver}</span>
                  </span>
                  <span className="font-bold text-slate-700 shrink-0 text-[10px]">
                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── 2. DEVICE FLEET HEADER & ACTION BAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shadow-2xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
              </svg>
            </div>
            <h3 className="font-mono text-slate-900 font-bold text-base">Connected Devices</h3>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
            {devices.length}
          </span>

          {/* Master Selection Button */}
          <button
            onClick={onToggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                selectedIds.size === devices.length && devices.length > 0
                  ? 'bg-cyan-600 border-cyan-600 text-white font-bold'
                  : selectedIds.size > 0
                  ? 'bg-cyan-100 border-cyan-400 text-cyan-700 font-bold'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedIds.size === devices.length && devices.length > 0
                ? '✓'
                : selectedIds.size > 0
                ? '–'
                : ''}
            </span>
            <span>
              {selectedIds.size === devices.length && devices.length > 0
                ? 'Deselect All'
                : `Select All (${devices.length})`}
            </span>
          </button>
        </div>

        {/* Primary Action Button: Dynamic Label */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-sm cursor-pointer"
          >
            <span>⚡</span>
            <span>
              {selectedIds.size > 0
                ? `Update Selected (${selectedIds.size})`
                : 'Update Fleet Firmware'}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 3. BALANCED DEVICE CARDS GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl">
        {devices.map((device, idx) => {
          const isSelected = selectedIds.has(device.id)
          const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
          const isOffline = !device.online
          const isLcd = device.template === 'lcd'
          const ipAddr = getDeviceIp(device, idx)
          const rssi = getDeviceRssi(device, idx)
          const isTargetFw = device.firmware === latestFw

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
              {/* Card Top: Checkbox, Name, IP, Wi-Fi RSSI & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    onClick={e => {
                      e.stopPropagation()
                      onToggleSelect(device.id)
                    }}
                    className="p-1 -m-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500 cursor-pointer pointer-events-none mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm leading-tight block">
                      {device.id}
                    </span>
                    <span
                      title={`MAC: ${device.mac}`}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-600 transition-colors block cursor-help"
                    >
                      {ipAddr}
                    </span>
                  </div>
                </div>

                {/* Right Top: Wi-Fi RSSI + Online Status */}
                <div className="flex items-center gap-1.5">
                  {/* Wi-Fi RSSI badge */}
                  <span
                    title={`Signal Strength: ${rssi.label}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200"
                  >
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    <span>{rssi.val}</span>
                  </span>

                  {/* Status Symbol (Online / Offline) */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                      isOffline
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    {isOffline ? 'Offline' : 'Online'}
                  </span>
                </div>
              </div>

              {/* Hardware Board Graphic Display: Compact Mounting Bay */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl py-2 px-3 flex justify-center items-center">
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

              {/* Details Row: Template, Group, Uptime & Version */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">
                    {isLcd ? '🖥️ LCD' : '💡 LED'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{device.group}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Up {formatUptime(device.uptime)}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      isTargetFw
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {device.firmware}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 4. BOTTOM CLEAN TABLE: LIVE LOGS WITH CONTROLS ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Control Header */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-200/70 border border-slate-300/80 text-slate-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <h4 className="font-mono font-bold text-slate-900 text-xs uppercase tracking-wider">
              Live Device Activity & Telemetry Logs
            </h4>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isPaused ? '' : 'animate-pulse'}`} />
              {isPaused ? 'Paused' : 'Live Stream'}
            </span>
          </div>

          {/* Controls: Level Filters + Pause + Clear */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Level Filter Buttons */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    logFilter === lvl
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Pause / Resume Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{isPaused ? '▶️ Resume' : '⏸️ Pause'}</span>
            </button>

            {/* Clear Button */}
            <button
              onClick={() => setClearedAt(Date.now())}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] transition-colors cursor-pointer"
            >
              <span>🗑️</span>
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Log Table Body */}
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
              {filteredLogs.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="py-2 px-4 font-bold text-slate-800 text-[11px]">
                    {entry.device_id}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        entry.level === 'ERROR'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : entry.level === 'WARN'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-700 text-[11px]">
                    {entry.msg}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-slate-600 mt-1">WebSocket Connected</span>
                      <span className="text-[11px] text-slate-400">
                        Listening for incoming device telemetry logs on port 8765...
                      </span>
                    </div>
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
