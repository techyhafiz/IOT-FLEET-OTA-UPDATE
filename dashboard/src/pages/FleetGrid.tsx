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
  onOpenUpdateModal: (deviceId?: string) => void
  onRefresh?: () => void
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${seconds % 60}s`
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
  onRefresh,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [floorPush, setFloorPush] = useState<string | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushNote, setPushNote] = useState<string | null>(null)

  // Floor (group) list derived from live devices
  const floorNames = useMemo(
    () => Array.from(new Set(devices.map(d => d.group))).sort(),
    [devices]
  )

  async function handleFloorPush() {
    if (!floorPush) return
    setPushBusy(true)
    setPushNote(null)
    try {
      const apiMod = await import('../hooks/useWebSocket')
      const res = await apiMod.api.post('/api/ota/group', { group: floorPush, version: firmware[0]?.version })
      setPushNote(`Pushed ${firmware[0]?.version} → ${floorPush} (${(res as { pushed?: string[] }).pushed?.length ?? 0} devices)`)
      setTimeout(() => setPushNote(null), 4000)
    } catch {
      setPushNote('Push failed')
    } finally {
      setPushBusy(false)
    }
  }

  const total = devices.length
  const onlineCount = devices.filter(d => d.online).length
  const latestFw = firmware[0]?.version || 'v1.3.0'
  const adopted = devices.filter(d => d.firmware === latestFw).length
  const adoptionPct = total > 0 ? Math.round((adopted / total) * 100) : 0

  // Version counts for the Pie / Donut Chart
  const versionCounts: Record<string, number> = {}
  devices.forEach(d => {
    versionCounts[d.firmware] = (versionCounts[d.firmware] || 0) + 1
  })
  const versionEntries = Object.entries(versionCounts)
  let cumulativePercent = 0

  // Filter devices based on search query — searches live fields only
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    const q = searchQuery.toLowerCase()
    return devices.filter(
      d =>
        d.id.toLowerCase().includes(q) ||
        (d.ip || '').includes(q) ||
        (d.name || '').toLowerCase().includes(q) ||
        d.firmware.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q)
    )
  }, [devices, searchQuery])

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto w-full">
      {/* ─── ROW 1: 4 KPI STATS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Fleet Nodes */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              FLEET NODES
            </span>
            <div className="text-xl font-sans font-bold text-slate-900 leading-tight">{total}</div>
            <span className="text-[10px] text-slate-500 font-sans block">ESP32 DevKit V1</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
            </svg>
          </div>
        </div>

        {/* Card 2: Connectivity */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              CONNECTIVITY
            </span>
            <div className="text-xl font-sans font-bold text-emerald-600 leading-tight flex items-baseline gap-1.5">
              <span>{onlineCount}</span>
              <span className="text-xs text-slate-400 font-normal">/ {total}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {total > 0 ? Math.round((onlineCount / total) * 100) : 0}% Heartbeat
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
        </div>

        {/* Card 3: Target Release */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              TARGET RELEASE
            </span>
            <div className="text-xl font-sans font-bold text-slate-900 leading-tight">{latestFw}</div>
            <div className="mt-0.5">
              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                adoptionPct === 100
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-amber-800 bg-amber-50 border-amber-200/80'
              }`}>
                {adopted} / {total} Adopted ({adoptionPct}%)
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        {/* Card 4: Firmware Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs flex items-center gap-2.5">
          {/* Donut SVG with Devices in Center */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 42 42" className="w-12 h-12 transform -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="5.5"
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
                    strokeWidth="5.5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                )
              })}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-sans text-xs font-bold text-slate-900 leading-none">
                {total}
              </span>
              <span className="text-[7px] font-medium text-slate-500 mt-0.5">
                Devices
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-0.5">
            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              FIRMWARE BREAKDOWN
            </span>
            <div className="space-y-0 text-[10px]">
              {versionEntries.map(([ver, count], i) => (
                <div key={ver} className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-slate-600 text-[10px]">{ver}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800 text-[10px]">{count}</span>
                    <span className="text-slate-400 text-[8px]">
                      ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: ACTION BAR ─────────────────────────────────────────────────── */}
      <div className="bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Connected Devices + Count + Select All */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
            </svg>
          </div>
          <h3 className="font-sans text-slate-900 font-bold text-sm">Connected Devices</h3>
          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.2 rounded-full border border-slate-200">
            {devices.length}
          </span>

          <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-xs font-sans text-slate-700 font-medium select-none">
            <input
              type="checkbox"
              checked={selectedIds.size === devices.length && devices.length > 0}
              onChange={onToggleAll}
              className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Select All ({devices.length})</span>
          </label>
        </div>

        {/* Right: Search + Refresh + Update Fleet Firmware */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-50/70 border border-slate-200 rounded-xl w-44 sm:w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          {/* Floor-wise push */}
          <div className="flex items-center gap-1.5">
            <select
              value={floorPush ?? ''}
              onChange={e => setFloorPush(e.target.value || null)}
              className="px-2 py-1 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              title="Push the target release to one floor"
            >
              <option value="">Floor…</option>
              {floorNames.map(f => (
                <option key={f} value={f}>{f} ({devices.filter(d => d.group === f).length})</option>
              ))}
            </select>
            <button
              onClick={handleFloorPush}
              disabled={!floorPush || pushBusy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-40"
              title={`Push ${firmware[0]?.version} to every device on the selected floor`}
            >
              <span>⇪</span>
              <span>Push Floor</span>
            </button>
          </div>

          {/* Primary Action: Update Fleet Firmware */}
          <button
            onClick={() => onOpenUpdateModal()}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>⚡</span>
            <span>Update Fleet Firmware</span>
          </button>
        </div>
      </div>

      {/* Floor-push confirmation */}
      {pushNote && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-1.5 text-xs font-semibold animate-fade-in">
          {pushNote}
        </div>
      )}

      {/* ─── ROW 3: DEVICE CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map(device => {
          const isSelected = selectedIds.has(device.id)
          const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
          const isOffline = !device.online
          const needsUpdate = device.firmware !== latestFw

          return (
            <div
              key={device.id}
              className={`bg-white border rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col ${
                isSelected
                  ? 'border-emerald-400 ring-2 ring-emerald-100'
                  : isUpdating
                  ? 'border-amber-300 ring-2 ring-amber-100'
                  : 'border-slate-200'
              }`}
            >
              {/* ── Card Header ─────────────────────────────────────── */}
              <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(device.id)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight tracking-tight">{device.id}</p>
                    <p className="text-[10px] font-mono text-slate-400 leading-tight mt-0.5">{device.ip ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md font-mono text-[9px] text-cyan-700 bg-cyan-50 border border-cyan-200" title="Device group">
                    {device.group}
                  </span>
                  {isUpdating ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Updating
                    </span>
                  ) : isOffline ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-semibold bg-red-50 text-red-700 border border-red-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Offline
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  )}
                </div>
              </div>

              {/* ── ESP32 Board Preview ──────────────────────────────── */}
              {/* Pin states intentionally hidden on grid cards — detail views only */}
              <div className="mx-3 mb-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center py-1.5">
                <Esp32Board
                  size="xs"
                  template={device.template}
                  isUpdating={isUpdating}
                  isOffline={isOffline}
                />
              </div>

              {/* OTA progress bar */}
              {isUpdating && (
                <div className="mx-3 mb-1.5 space-y-0.5 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <div className="flex justify-between text-[9px] font-mono font-bold text-amber-800">
                    <span>⚡ FLASHING FIRMWARE</span>
                    <span>{device.ota_progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${device.ota_progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Update failed — device unreachable, server keeps retrying */}
              {device.ota_state === 'failed' && (
                <div className="mx-3 mb-1.5 flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-[10px] font-semibold text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  Update failed — retrying every 10s ({device.ota_pending})
                </div>
              )}

              {/* Cross-template firmware flashed — device bricked until power cycle */}
              {device.ota_state === 'incompatible' && (
                <div className="mx-3 mb-1.5 px-2 py-1 bg-red-50 border border-red-300 rounded-lg text-[10px] font-semibold text-red-700">
                  ⚠ Device not compatible / no response — power-cycle it in the simulator to recover
                </div>
              )}

              {/* ── Telemetry Grid (all LIVE from device heartbeats) ──── */}
              <div className="px-3.5 pb-1.5 flex-1">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Current FW</span>
                    <span className={`font-mono font-bold text-xs leading-tight ${needsUpdate ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {device.firmware}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Target FW</span>
                    <span className="font-mono font-bold text-xs text-slate-900 leading-tight">{latestFw}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Uptime</span>
                    <span className="font-mono text-xs text-slate-700 leading-tight">{fmtUptime(device.uptime ?? 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Last Seen</span>
                    <span className="font-mono text-xs text-slate-700 leading-tight">{device.last_heartbeat ?? '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Hardware</span>
                    <span className="font-mono text-xs text-slate-700 leading-tight">{device.template === 'lcd' ? '16×2 LCD' : 'LED ×4'}</span>
                  </div>
                </div>

                {needsUpdate && !isUpdating && (
                  <div className="mt-1 flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px]">
                    <svg className="w-2.5 h-2.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span className="font-semibold text-amber-700">Firmware update available</span>
                  </div>
                )}
              </div>

              {/* ── Card Footer: Action Buttons ──────────────────────── */}
              <div className="px-3 pb-2 pt-1 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onOpenDevice(device)}
                  className="flex items-center justify-center gap-1 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Details</span>
                </button>

                <button
                  onClick={() => onOpenDevice(device)}
                  className="flex items-center justify-center gap-1 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Logs</span>
                </button>

                <button
                  onClick={() => onOpenUpdateModal(device.id)}
                  className="flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Update</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
