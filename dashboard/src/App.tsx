import React, { useState, useEffect, useCallback } from 'react'
import type { Device, Group, FirmwareVersion, LogEntry, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { FleetGrid } from './pages/FleetGrid'
import { FirmwarePage } from './pages/FirmwarePage'
import { LogsPage } from './pages/LogsPage'
import { ConfigPage } from './pages/ConfigPage'
import { DevicePanel } from './components/DevicePanel'
import { BatchOTAModal } from './components/BatchOTAModal'
import './index.css'

type Tab = 'fleet' | 'firmware' | 'logs' | 'config'

export default function App() {
  const [tab, setTab] = useState<Tab>('fleet')
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [firmware, setFirmware] = useState<FirmwareVersion[]>([])
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [panelDevice, setPanelDevice] = useState<Device | null>(null)
  const [showBatch, setShowBatch] = useState(false)
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadAll = useCallback(async () => {
    const [devs, grps, fws] = await Promise.all([
      api.get('/api/devices'),
      api.get('/api/groups'),
      api.get('/api/firmware'),
    ])
    setDevices(devs)
    setGroups(grps)
    setFirmware(fws)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleWsEvent = useCallback((event: WSEvent) => {
    if (event.type === 'device_log') {
      setLiveLogs(prev => [...prev.slice(-499), event.payload as LogEntry])
    }
    setDevices(prev => {
      switch (event.type) {
        case 'device_registered':
          if (prev.find(d => d.id === event.device_id)) return prev
          return [...prev, event.payload as Device]
        case 'device_removed':
          return prev.filter(d => d.id !== event.device_id)
        case 'device_status':
        case 'ota_progress':
        case 'ota_complete':
          return prev.map(d => d.id === event.device_id
            ? { ...d, ...(event.payload as Partial<Device>) } : d)
        default: return prev
      }
    })
    // Update panel device if open
    setPanelDevice(prev => {
      if (!prev || prev.id !== event.device_id) return prev
      if (['device_status','ota_progress','ota_complete'].includes(event.type))
        return { ...prev, ...(event.payload as Partial<Device>) }
      return prev
    })
  }, [])

  const { connected } = useWebSocket(handleWsEvent)

  const onlineCount  = devices.filter(d => d.online).length
  const offlineCount = devices.filter(d => !d.online).length
  const latestFw = firmware[0]?.version ?? '—'

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })
  const toggleAll = () => setSelectedIds(
    selectedIds.size === devices.length ? new Set() : new Set(devices.map(d => d.id))
  )

  const tabClass = (t: Tab) => `px-4 py-2 text-sm font-mono rounded-lg transition-colors font-medium ${
    tab === t ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-bold text-cyan-700 font-mono">IoT OTA Manager</h1>
              <p className="text-xs text-slate-400 font-mono">PC-A — Mission Control</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-4">
            {(['fleet','firmware','logs','config'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status chips */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              {onlineCount} online
            </span>
            {offlineCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500"/>
                {offlineCount} offline
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md font-bold">
              {latestFw}
            </span>
          </div>

          {/* WebSocket status */}
          <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
            connected ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-rose-300 text-rose-700 bg-rose-50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}/>
            {connected ? 'Live' : 'Offline'}
          </div>

          {/* Clock */}
          <span className="text-xs font-mono text-slate-500 font-medium">
            {now.toLocaleTimeString()}
          </span>

          {/* Batch push button */}
          {selectedIds.size >= 2 && (
            <button onClick={() => setShowBatch(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-sm rounded-lg font-bold transition-colors shadow-xs">
              ⬆ Push Update ({selectedIds.size})
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {tab === 'fleet' && (
          <aside className="w-56 border-r border-slate-200 bg-white p-4 shrink-0 overflow-y-auto">
            <div className="mb-5">
              <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">Groups</div>
              <button
                onClick={() => setGroupFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors mb-1 ${
                  !groupFilter ? 'bg-cyan-50 text-cyan-800 font-bold border-l-2 border-cyan-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                All Devices ({devices.length})
              </button>
              {groups.map(g => (
                <button key={g.name}
                  onClick={() => setGroupFilter(groupFilter === g.name ? null : g.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors mb-1 ${
                    groupFilter === g.name ? 'bg-cyan-50 text-cyan-800 font-bold border-l-2 border-cyan-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {g.name} ({g.device_count})
                </button>
              ))}
            </div>
            <div className="mb-4">
              <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">Firmware</div>
              {firmware.map(fw => (
                <div key={fw.version} className="flex justify-between px-3 py-1.5 text-xs font-mono rounded hover:bg-slate-50">
                  <span className={fw.version === latestFw ? 'text-amber-700 font-bold' : 'text-slate-700'}>{fw.version}</span>
                  <span className="text-slate-400 font-semibold">{fw.device_count}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {tab === 'fleet' && (
            <FleetGrid
              devices={devices}
              groupFilter={groupFilter}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onOpenDevice={(d) => setPanelDevice(d)}
            />
          )}
          {tab === 'firmware' && <FirmwarePage firmware={firmware} onRefresh={loadAll}/>}
          {tab === 'logs' && <LogsPage liveLogs={liveLogs} devices={devices}/>}
          {tab === 'config' && <ConfigPage groups={groups} devices={devices}/>}
        </main>

        {/* Device detail slide-in panel */}
        {panelDevice && (
          <DevicePanel
            device={panelDevice}
            onClose={() => setPanelDevice(null)}
            onOTA={async (id, version) => {
              await api.post('/api/ota/push', { device_ids: [id], version })
            }}
          />
        )}
      </div>

      {showBatch && (
        <BatchOTAModal
          deviceIds={Array.from(selectedIds)}
          devices={devices}
          firmware={firmware}
          onClose={() => { setShowBatch(false); setSelectedIds(new Set()) }}
        />
      )}
    </div>
  )
}
