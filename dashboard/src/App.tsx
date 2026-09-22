import React, { useState, useEffect, useCallback } from 'react'
import type { Device, FirmwareVersion, LogEntry, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { FleetGrid } from './pages/FleetGrid'
import { FirmwarePage } from './pages/FirmwarePage'
import { DevicePanel } from './components/DevicePanel'
import { UpdateFirmwareModal } from './components/UpdateFirmwareModal'
import './index.css'

type Tab = 'home' | 'firmware'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [devices, setDevices] = useState<Device[]>([])
  const [firmware, setFirmware] = useState<FirmwareVersion[]>([])
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [panelDevice, setPanelDevice] = useState<Device | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadAll = useCallback(async () => {
    const [devs, fws] = await Promise.all([
      api.get('/api/devices'),
      api.get('/api/firmware'),
    ])
    setDevices(devs)
    setFirmware(fws)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleWsEvent = useCallback((event: WSEvent) => {
    if (event.type === 'device_log') {
      setLiveLogs(prev => [...prev.slice(-199), event.payload as LogEntry])
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
          return prev.map(d =>
            d.id === event.device_id ? { ...d, ...(event.payload as Partial<Device>) } : d
          )
        default:
          return prev
      }
    })
    // Update panel device if open
    setPanelDevice(prev => {
      if (!prev || prev.id !== event.device_id) return prev
      if (['device_status', 'ota_progress', 'ota_complete'].includes(event.type)) {
        return { ...prev, ...(event.payload as Partial<Device>) }
      }
      return prev
    })
  }, [])

  const { connected } = useWebSocket(handleWsEvent)

  const onlineCount = devices.filter(d => d.online).length
  const latestFw = firmware[0]?.version ?? '—'

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.size === devices.length ? new Set() : new Set(devices.map(d => d.id))
    )

  const handleDeployFirmware = async (
    targets: { deviceId: string; version: string; isRollback?: boolean }[]
  ) => {
    for (const target of targets) {
      if (target.isRollback) {
        await api.post('/api/ota/rollback', { device_id: target.deviceId, version: target.version })
      } else {
        await api.post('/api/ota/push', { device_ids: [target.deviceId], version: target.version })
      }
    }
    await loadAll()
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-xs font-mono rounded-xl transition-all font-bold flex items-center gap-1.5 ${
      tab === t
        ? 'bg-cyan-700 text-white shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 font-mono tracking-tight">IoT OTA Mission Control</h1>
                <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded-full">
                  PC-A
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono font-medium">ESP32 Fleet Telemetry & OTA Deployment</p>
            </div>
          </div>

          {/* Only 2 Tabs: Home and Firmware with crisp SVG icons */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
            <button onClick={() => setTab('home')} className={tabClass('home')}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
            <button onClick={() => setTab('firmware')} className={tabClass('firmware')}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Firmware
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status chips: De-duplicated (Target FW is prominently displayed in KPI card below) */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} Online
            </span>
          </div>

          {/* WebSocket transport status */}
          <div
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border font-semibold ${
              connected
                ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                : 'border-rose-300 text-rose-700 bg-rose-50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-indigo-500 animate-ping' : 'bg-rose-500'
              }`}
            />
            {connected ? 'WS Live' : 'WS Offline'}
          </div>

          {/* Clock: Anchored with icon and timezone */}
          <span className="flex items-center gap-1.5 text-xs font-mono text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {now.toLocaleTimeString()}
            <span className="text-[10px] text-slate-400 font-bold">UTC</span>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <FleetGrid
            devices={devices}
            firmware={firmware}
            logs={liveLogs}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onOpenDevice={d => setPanelDevice(d)}
            onOpenUpdateModal={() => setShowUpdateModal(true)}
          />
        )}

        {tab === 'firmware' && (
          <FirmwarePage
            firmware={firmware}
            onRefresh={loadAll}
          />
        )}
      </main>

      {/* Slide-in Device Telemetry Inspection Drawer */}
      {panelDevice && (
        <DevicePanel
          device={panelDevice}
          onClose={() => setPanelDevice(null)}
          onOTA={async (id, ver) => {
            await api.post('/api/ota/push', { device_ids: [id], version: ver })
            await loadAll()
          }}
        />
      )}

      {/* Clean Tabular Update Firmware Modal */}
      <UpdateFirmwareModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        devices={devices}
        initialSelectedIds={selectedIds}
        firmware={firmware}
        onDeploy={handleDeployFirmware}
      />
    </div>
  )
}
