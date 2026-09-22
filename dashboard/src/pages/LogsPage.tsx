import React, { useState, useEffect, useRef } from 'react'
import type { Device, LogEntry } from '@shared/types'

interface Props {
  liveLogs: LogEntry[]
  devices: Device[]
}

export function LogsPage({ liveLogs, devices }: Props) {
  const [deviceFilter, setDeviceFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalLogs(liveLogs) }, [liveLogs])

  useEffect(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localLogs, autoScroll])

  const filtered = localLogs.filter(log => {
    if (deviceFilter !== 'all' && log.device_id !== deviceFilter) return false
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    return true
  })

  const logColor = (level: string) => {
    if (level === 'WARN') return 'text-amber-400'
    if (level === 'ERROR') return 'text-red-400'
    return 'text-slate-300'
  }
  const levelBadge = (level: string) => {
    if (level === 'WARN') return 'bg-amber-900/50 text-amber-400'
    if (level === 'ERROR') return 'bg-red-900/50 text-red-400'
    return 'bg-green-900/30 text-green-400'
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="font-mono font-bold text-slate-200 mr-2">📋 Live Logs</h2>
        <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500">
          <option value="all">All Devices</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500">
          <option value="all">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-xs font-mono px-2 py-1.5 rounded-lg border transition-colors ${
            autoScroll ? 'bg-cyan-900/30 border-cyan-700 text-cyan-400' : 'border-slate-600 text-slate-500'
          }`}
        >
          Auto-scroll {autoScroll ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setLocalLogs([])}
          className="text-xs font-mono px-2 py-1.5 rounded-lg border border-slate-600 text-slate-500 hover:text-slate-300 transition-colors">
          Clear
        </button>
        <span className="ml-auto text-xs font-mono text-slate-600">{filtered.length} entries</span>
      </div>

      {/* Log stream */}
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-y-auto font-mono text-xs">
        {filtered.length === 0 && (
          <div className="text-slate-600 italic">Waiting for log entries from devices...</div>
        )}
        {filtered.map((log, i) => (
          <div key={i} className="flex gap-2 hover:bg-slate-800/50 px-1 py-0.5 rounded">
            <span className="text-slate-600 shrink-0 w-16">{log.timestamp}</span>
            <span className="text-cyan-500 shrink-0 w-20 truncate">[{log.device_id}]</span>
            <span className={`shrink-0 w-12 text-center text-xs px-1 rounded ${levelBadge(log.level)}`}>{log.level}</span>
            <span className={logColor(log.level)}>{log.msg}</span>
          </div>
        ))}
        <div ref={logEndRef}/>
      </div>
    </div>
  )
}
