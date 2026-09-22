import React from 'react'
import type { Device, FirmwareVersion } from '@shared/types'

interface Props {
  devices: Device[]
  firmware: FirmwareVersion[]
}

interface DeploymentRecord {
  id: string
  deviceId: string
  version: string
  type: 'Batch OTA' | 'Canary' | 'Auto-Rollback' | 'Manual'
  timestamp: string
  duration: string
  checksum: string
  status: 'SUCCESS' | 'ROLLED_BACK'
}

const DEMO_HISTORY: DeploymentRecord[] = [
  {
    id: 'DEP-9812',
    deviceId: 'ESP-A1F3',
    version: 'v1.2.0',
    type: 'Batch OTA',
    timestamp: 'Today, 21:15:20',
    duration: '4.2s',
    checksum: '4b82d9f1c7e9...',
    status: 'SUCCESS',
  },
  {
    id: 'DEP-9811',
    deviceId: 'ESP-B2C4',
    version: 'v1.2.0',
    type: 'Batch OTA',
    timestamp: 'Today, 21:15:21',
    duration: '4.5s',
    checksum: '4b82d9f1c7e9...',
    status: 'SUCCESS',
  },
  {
    id: 'DEP-9804',
    deviceId: 'ESP-C9D1',
    version: 'v2.2.0-faulty',
    type: 'Auto-Rollback',
    timestamp: 'Today, 20:42:10',
    duration: '1.8s',
    checksum: 'deadbeef8bad...',
    status: 'ROLLED_BACK',
  },
  {
    id: 'DEP-9799',
    deviceId: 'ESP-A1F3',
    version: 'v1.1.0',
    type: 'Canary',
    timestamp: 'Yesterday, 18:30:00',
    duration: '3.9s',
    checksum: '7c91e2a4b8d6...',
    status: 'SUCCESS',
  },
]

export function AnalyticsPage({ devices, firmware }: Props) {
  const total = devices.length
  const online = devices.filter(d => d.online).length
  const updating = devices.filter(d => (d.ota_progress ?? 0) > 0).length

  // Calculate version distribution
  const versionCounts: Record<string, number> = {}
  devices.forEach(d => {
    versionCounts[d.firmware] = (versionCounts[d.firmware] || 0) + 1
  })

  const versionColors: Record<string, string> = {
    'v1.2.0': 'bg-cyan-600',
    'v1.1.0': 'bg-amber-500',
    'v1.0.0': 'bg-slate-400',
    'v2.2.0-faulty': 'bg-rose-500',
  }

  function handleExportCSV() {
    const headers = 'Deployment_ID,Device_ID,Version,Type,Timestamp,Duration,Checksum,Status\n'
    const rows = DEMO_HISTORY.map(r =>
      `${r.id},${r.deviceId},${r.version},${r.type},${r.timestamp},${r.duration},${r.checksum},${r.status}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ota_deployment_audit_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-800">📊 Fleet Analytics & Health</h2>
          <p className="text-xs font-mono text-slate-500 mt-0.5">Real-time telemetry, firmware distribution, and deployment metrics</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold rounded-lg shadow-xs transition-colors"
        >
          <span>📥</span> Export Audit CSV
        </button>
      </div>

      {/* Metric Cards with Professional Visual Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fleet Health */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Fleet Health Index</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold shadow-2xs">
              🛡️
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-bold font-mono text-emerald-700 tracking-tight">98.9%</span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
              OPTIMAL
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">Zero packet drop across mesh</p>
        </div>

        {/* Active Connectivity */}
        <div className="bg-gradient-to-br from-cyan-50/60 via-white to-white border border-cyan-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Active Connectivity</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center text-sm font-bold shadow-2xs">
              🔌
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-bold font-mono text-cyan-800 tracking-tight">{online} / {total}</span>
            <span className="text-[10px] font-mono text-cyan-800 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-full font-bold">
              ONLINE
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">{updating > 0 ? `${updating} flashing now` : 'All nodes in heartbeat sync'}</p>
        </div>

        {/* OTA Success Rate */}
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-white border border-indigo-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">OTA Success Rate</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm font-bold shadow-2xs">
              🎯
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-bold font-mono text-indigo-800 tracking-tight">96.8%</span>
            <span className="text-[10px] font-mono text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full font-bold">
              31 / 32
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">1 self-healing auto-rollback</p>
        </div>

        {/* Avg Transfer Speed */}
        <div className="bg-gradient-to-br from-amber-50/60 via-white to-white border border-amber-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Avg Transfer Speed</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold shadow-2xs">
              ⚡
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-bold font-mono text-amber-800 tracking-tight">192 KB/s</span>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
              Wi-Fi Direct
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">Avg duration: 4.1s per node</p>
        </div>
      </div>

      {/* Firmware Distribution Visual */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-slate-800 uppercase tracking-wider">Firmware Fleet Distribution</h3>
          <span className="text-xs font-mono text-slate-400">{total} devices managed</span>
        </div>

        {/* Stacked Bar */}
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {Object.entries(versionCounts).map(([ver, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div
                key={ver}
                style={{ width: `${pct}%` }}
                className={`${versionColors[ver] || 'bg-slate-400'} transition-all duration-500`}
                title={`${ver}: ${count} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {firmware.map(fw => {
            const count = versionCounts[fw.version] || 0
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
            return (
              <div key={fw.version} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${versionColors[fw.version] || 'bg-slate-400'}`}/>
                  <span className="font-mono font-bold text-xs text-slate-800">{fw.version}</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-lg font-bold font-mono text-slate-900">{count}</span>
                  <span className="text-xs font-mono text-slate-500">{pct}%</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1 truncate" title={fw.changelog}>
                  {fw.changelog}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deployment Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-800 uppercase tracking-wider">Recent Deployment Audit Trail</h3>
            <p className="text-xs font-mono text-slate-400">Cryptographically verified flash operations and automatic rollbacks</p>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
            Audit Ledger Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="pb-3">Deploy ID</th>
                <th className="pb-3">Device</th>
                <th className="pb-3">Target Version</th>
                <th className="pb-3">Strategy</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Flash Time</th>
                <th className="pb-3">SHA-256 Checksum</th>
                <th className="pb-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_HISTORY.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-bold text-cyan-700">{row.id}</td>
                  <td className="py-3 font-semibold text-slate-800">{row.deviceId}</td>
                  <td className="py-3 font-bold text-slate-900">{row.version}</td>
                  <td className="py-3">
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{row.timestamp}</td>
                  <td className="py-3 text-slate-600">{row.duration}</td>
                  <td className="py-3 text-slate-400 font-mono">{row.checksum}</td>
                  <td className="py-3 text-right">
                    {row.status === 'SUCCESS' ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">
                        ✓ VERIFIED
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-700 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">
                        ↺ AUTO-ROLLED BACK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
