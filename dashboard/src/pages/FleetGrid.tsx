import React, { useState, useMemo } from 'react'
import type { Device, FirmwareVersion, LogEntry } from '@shared/types'
import { Esp32Board } from '@shared/components/Esp32Board'
import { AdaptiveViewport } from '../components/AdaptiveViewport'

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

interface TelemetryInfo {
  ip: string
  rssi: number
  uptime: string
  lastHeartbeat: string
  temp: string
  heap: string
}

const DEVICE_STATIC_DATA: Record<string, TelemetryInfo> = {
  'ESP-A1F3': {
    ip: '192.168.1.101',
    rssi: -58,
    uptime: '2d 14h',
    lastHeartbeat: '10:33:50 PM',
    temp: '32 °C',
    heap: '180 KB',
  },
  'ESP-B2C4': {
    ip: '192.168.1.102',
    rssi: -64,
    uptime: '5d 3h',
    lastHeartbeat: '10:33:52 PM',
    temp: '34 °C',
    heap: '212 KB',
  },
  'ESP-C9D1': {
    ip: '192.168.1.103',
    rssi: -72,
    uptime: '1d 8h',
    lastHeartbeat: '10:33:48 PM',
    temp: '31 °C',
    heap: '196 KB',
  },
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
  const [healthTimeframe, setHealthTimeframe] = useState('Last 24 Hours')

  const total = devices.length
  const onlineCount = devices.filter(d => d.online).length
  const latestFw = firmware[0]?.version || 'v1.3.0'

  // Version counts for the Pie / Donut Chart
  const versionCounts: Record<string, number> = {}
  devices.forEach(d => {
    versionCounts[d.firmware] = (versionCounts[d.firmware] || 0) + 1
  })
  const versionEntries = Object.entries(versionCounts)
  let cumulativePercent = 0

  // Filter devices based on search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    const q = searchQuery.toLowerCase()
    return devices.filter(
      d =>
        d.id.toLowerCase().includes(q) ||
        (DEVICE_STATIC_DATA[d.id]?.ip || '').includes(q) ||
        d.firmware.toLowerCase().includes(q)
    )
  }, [devices, searchQuery])

  // Recent Activity Events
  const activityEvents = [
    {
      time: '10:33:52 PM',
      device: 'ESP-B2C4',
      event: 'Heartbeat',
      dotColor: 'bg-blue-500',
      details: 'Device online',
      status: 'Success',
    },
    {
      time: '10:33:50 PM',
      device: 'ESP-A1F3',
      event: 'Telemetry',
      dotColor: 'bg-cyan-500',
      details: 'Temp: 32°C, RSSI: -58',
      status: 'Success',
    },
    {
      time: '10:33:48 PM',
      device: 'ESP-C9D1',
      event: 'Heartbeat',
      dotColor: 'bg-emerald-500',
      details: 'Device online',
      status: 'Success',
    },
    {
      time: '10:32:15 PM',
      device: 'System',
      event: 'WebSocket',
      dotColor: 'bg-indigo-500',
      details: 'Client connected',
      status: 'Success',
    },
    {
      time: '10:30:12 PM',
      device: 'System',
      event: 'Firmware',
      dotColor: 'bg-amber-500',
      details: `${latestFw} uploaded`,
      status: 'Success',
    },
  ]

  return (
    <AdaptiveViewport baseHeight={760} minWidth={1080}>
      {/* ─── ROW 1: 4 KPI STATS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Fleet Nodes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              FLEET NODES
            </span>
            <div className="text-2xl font-sans font-bold text-slate-900 mt-0.5">{total}</div>
            <span className="text-[11px] text-slate-500 font-sans block">ESP32 DevKit V1</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
            </svg>
          </div>
        </div>

        {/* Card 2: Connectivity */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              CONNECTIVITY
            </span>
            <div className="text-2xl font-sans font-bold text-emerald-600 mt-0.5 flex items-baseline gap-1.5">
              <span>{onlineCount}</span>
              <span className="text-sm text-slate-400 font-normal">/ {total}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Heartbeat
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
        </div>

        {/* Card 3: Target Release */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              TARGET RELEASE
            </span>
            <div className="text-2xl font-sans font-bold text-slate-900 mt-0.5">{latestFw}</div>
            <div className="mt-0.5">
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 shadow-2xs">
                0 / 3 Adopted (0%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-2xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        {/* Card 4: Firmware Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3">
          {/* Donut SVG with 3 Devices in Center */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 42 42" className="w-14 h-14 transform -rotate-90">
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
              <span className="font-sans text-sm font-bold text-slate-900 leading-none">
                {total}
              </span>
              <span className="text-[8px] font-medium text-slate-500 mt-0.5">
                Devices
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-0.5 text-xs overflow-hidden">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              FIRMWARE BREAKDOWN
            </span>
            {versionEntries.slice(0, 3).map(([ver, count], i) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={ver} className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="font-mono text-slate-800 text-[10px]">{ver}</span>
                  </span>
                  <span className="font-sans text-slate-700 font-semibold text-[10px] shrink-0">
                    {count} <span className="text-slate-400 font-normal text-[9px]">({pct}%)</span>
                  </span>
                </div>
              )
            })}
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

      {/* ─── ROW 3: 3 DEVICE CARDS WITH SIDE-BY-SIDE TELEMETRY ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredDevices.map(device => {
          const isSelected = selectedIds.has(device.id)
          const isUpdating = (device.ota_progress ?? 0) > 0 && device.ota_progress !== null
          const isOffline = !device.online
          const staticData = DEVICE_STATIC_DATA[device.id] || {
            ip: '192.168.1.104',
            rssi: -65,
            uptime: '2d 4h',
            lastHeartbeat: '10:33:45 PM',
            temp: '32 °C',
            heap: '190 KB',
          }

          return (
            <div
              key={device.id}
              className={`bg-white border rounded-2xl p-3 space-y-2 shadow-2xs hover:shadow-md transition-all duration-150 ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                  : 'border-slate-200/90'
              }`}
            >
              {/* Card Header: Checkbox + ID + IP | RSSI + Online */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(device.id)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-sans font-bold text-slate-900 text-sm block leading-tight">
                      {device.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.2">
                      {staticData.ip}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Wi-Fi RSSI pill */}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md font-mono text-[9px] text-slate-500 bg-slate-100 border border-slate-200">
                    <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    <span>{staticData.rssi}</span>
                  </span>

                  {/* Online Badge */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-sans font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>

              {/* Card Body: Side-by-Side ESP32 Board & Telemetry Table */}
              <div className="flex items-center gap-3 pt-0.5">
                {/* Left: Authentic ESP32 Board */}
                <div className="w-22 shrink-0 flex items-center justify-center bg-slate-50/70 border border-slate-100 rounded-xl py-1 px-0.5">
                  <Esp32Board
                    size="xs"
                    template={device.template}
                    isUpdating={isUpdating}
                    isOffline={isOffline}
                    pins={device.gpio ?? {}}
                  />
                </div>

                {/* Right: Key-Value Telemetry Rows */}
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Current FW</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{device.firmware}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Target FW</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{latestFw}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Uptime</span>
                    <span className="font-mono text-slate-800 text-[11px]">{staticData.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Last Heartbeat</span>
                    <span className="font-mono text-slate-700 text-[10px]">{staticData.lastHeartbeat}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Temperature</span>
                    <span className="font-mono text-slate-800 text-[11px]">{staticData.temp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Free Heap</span>
                    <span className="font-mono text-slate-800 text-[11px]">{staticData.heap}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar if updating */}
              {isUpdating && (
                <div className="space-y-0.5 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                  <div className="flex justify-between text-[9px] font-mono text-emerald-800 font-bold">
                    <span>FLASHING FIRMWARE</span>
                    <span>{device.ota_progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-emerald-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${device.ota_progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Card Footer: 3 Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                <button
                  onClick={() => onOpenDevice(device)}
                  className="flex items-center justify-center gap-1 py-1 px-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => onOpenDevice(device)}
                  className="flex items-center justify-center gap-1 py-1 px-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Logs</span>
                </button>

                <button
                  onClick={() => onOpenUpdateModal(device.id)}
                  className="flex items-center justify-center gap-1 py-1 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Update</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── ROW 4: BOTTOM SECTION (RECENT ACTIVITY + FLEET HEALTH) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Recent Activity Table (7 columns) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h4 className="font-sans font-bold text-slate-900 text-xs">Recent Activity</h4>
              </div>
              <button className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 hover:underline cursor-pointer flex items-center gap-0.5">
                <span>View All</span>
                <span>&gt;</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-sans text-[10px]">
                    <th className="py-1 px-2.5 font-normal">Time (UTC)</th>
                    <th className="py-1 px-2.5 font-normal">Device</th>
                    <th className="py-1 px-2.5 font-normal">Event</th>
                    <th className="py-1 px-2.5 font-normal">Details</th>
                    <th className="py-1 px-2.5 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  {activityEvents.map((evt, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1 px-2.5 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                        {evt.time}
                      </td>
                      <td className="py-1 px-2.5 font-medium text-slate-800 text-[11px] whitespace-nowrap">
                        {evt.device}
                      </td>
                      <td className="py-1 px-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-slate-700 font-medium text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${evt.dotColor}`} />
                          {evt.event}
                        </span>
                      </td>
                      <td className="py-1 px-2.5 text-slate-500 text-[11px] truncate max-w-[180px]">
                        {evt.details}
                      </td>
                      <td className="py-1 px-2.5">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Fleet Health Area Chart (5 columns) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          {/* Header with Title + Dropdown + Mini-Donut */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-xs">Fleet Health</h4>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={healthTimeframe}
                onChange={e => setHealthTimeframe(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>

              {/* Circular Gauge: 3 Total Devices */}
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-8 h-8 transform -rotate-90">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray="100, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-sans text-[10px] font-bold text-slate-900 leading-none">3</span>
                  <span className="text-[5px] font-medium text-slate-400 leading-tight">Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area Chart & Breakdown */}
          <div className="pt-1">
            <div className="flex items-center justify-between gap-3">
              {/* SVG Area Chart */}
              <div className="flex-1 h-20 relative">
                <svg viewBox="0 0 240 100" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="20" y1="10" x2="235" y2="10" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="20" y1="30" x2="235" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="20" y1="50" x2="235" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="20" y1="70" x2="235" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="20" y1="90" x2="235" y2="90" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Y Axis Labels */}
                  <text x="5" y="14" className="text-[7px] fill-slate-400 font-mono">4</text>
                  <text x="5" y="34" className="text-[7px] fill-slate-400 font-mono">3</text>
                  <text x="5" y="54" className="text-[7px] fill-slate-400 font-mono">2</text>
                  <text x="5" y="74" className="text-[7px] fill-slate-400 font-mono">1</text>
                  <text x="5" y="93" className="text-[7px] fill-slate-400 font-mono">0</text>

                  {/* Area Fill */}
                  <polygon
                    fill="url(#greenAreaGrad)"
                    points="25,90 25,65 35,50 45,70 55,65 65,50 75,50 90,50 110,50 130,50 150,50 170,50 185,30 200,30 215,30 230,30 230,90"
                  />

                  {/* Line Stroke */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="25,65 35,50 45,70 55,65 65,50 75,50 90,50 110,50 130,50 150,50 170,50 185,30 200,30 215,30 230,30"
                  />

                  {/* Data Points */}
                  {[[25,65], [35,50], [45,70], [55,65], [65,50], [75,50], [90,50], [110,50], [130,50], [150,50], [170,50], [185,30], [200,30], [215,30], [230,30]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="1.5" fill="#10b981" />
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between pl-6 pr-2 pt-0.5 font-mono text-[8px] text-slate-400">
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                </div>
              </div>

              {/* Status Breakdown Legend */}
              <div className="w-24 shrink-0 space-y-0.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px]">Online</span>
                  </span>
                  <span className="font-bold text-[10px]">3 <span className="text-slate-400 font-normal">(100%)</span></span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-[10px]">Offline</span>
                  </span>
                  <span className="font-bold text-[10px]">0 <span className="text-slate-400 font-normal">(0%)</span></span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px]">Updating</span>
                  </span>
                  <span className="font-bold text-[10px]">0 <span className="text-slate-400 font-normal">(0%)</span></span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    <span className="text-[10px]">Failed</span>
                  </span>
                  <span className="font-bold text-[10px]">0 <span className="text-slate-400 font-normal">(0%)</span></span>
                </div>
              </div>
            </div>

            {/* Bottom Status Filter Dots */}
            <div className="flex items-center justify-center gap-3 pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Offline
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Updating
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                Failed
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdaptiveViewport>
  )
}
