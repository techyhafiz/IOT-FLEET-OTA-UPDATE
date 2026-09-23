import React, { useState, useEffect, useCallback } from 'react'
import type { Device, FirmwareVersion, LogEntry, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { FleetGrid } from './pages/FleetGrid'
import { FirmwarePage } from './pages/FirmwarePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DevicePanel } from './components/DevicePanel'
import { UpdateFirmwareModal } from './components/UpdateFirmwareModal'
import './index.css'

export type NavTab = 'home' | 'devices' | 'firmware' | 'deployments' | 'analytics' | 'settings'

export default function App() {
  const [tab, setTab] = useState<NavTab>('home')
  const [devices, setDevices] = useState<Device[]>([])
  const [firmware, setFirmware] = useState<FirmwareVersion[]>([])
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [panelDevice, setPanelDevice] = useState<Device | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
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
  const latestFw = firmware[0]?.version ?? 'v1.3.0'

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

  const openUpdateModalForDevice = (deviceId?: string) => {
    if (deviceId) {
      setSelectedIds(new Set([deviceId]))
    }
    setShowUpdateModal(true)
  }

  return (
    <div className="h-screen bg-slate-50/50 text-slate-900 flex font-sans overflow-hidden">
      {/* ─── LEFT SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className="w-52 border-r border-slate-200 bg-white flex flex-col p-3 shrink-0 shadow-2xs">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-2.5 mb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 leading-tight uppercase tracking-tight">OTA Fleet Management</h1>
          </div>
        </div>

        {/* Nav Links */}
        <div className="space-y-0.5 flex-1">
            <button
              onClick={() => setTab('home')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tab === 'home'
                  ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${tab === 'home' ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </button>

            <button
              onClick={() => setTab('devices')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                tab === 'devices'
                  ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${tab === 'devices' ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Devices</span>
            </button>

            <button
              onClick={() => setTab('firmware')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                tab === 'firmware'
                  ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${tab === 'firmware' ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Firmware</span>
            </button>

            <button
              onClick={() => openUpdateModalForDevice()}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 12 12 8 8 12" />
                <line x1="12" y1="16" x2="12" y2="8" />
              </svg>
              <span>Deployments</span>
            </button>

            <button
              onClick={() => setTab('analytics')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                tab === 'analytics'
                  ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${tab === 'analytics' ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setTab('settings')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                tab === 'settings'
                  ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${tab === 'settings' ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>

            <div className="pt-3 mt-3 border-t border-slate-200/80">
              <a
                href="/simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-cyan-800 bg-cyan-50/90 hover:bg-cyan-100 border border-cyan-200/70 transition-all cursor-pointer shadow-2xs group"
                title="Open ESP32 Hardware Simulator (PC-B)"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤖</span>
                  <span>PC-B Simulator</span>
                </div>
                <svg className="w-3.5 h-3.5 text-cyan-600 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

        </aside>

        {/* Right Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-3 lg:p-4">
          {(tab === 'home' || tab === 'devices') && (
            <FleetGrid
              devices={devices}
              firmware={firmware}
              logs={liveLogs}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onOpenDevice={d => setPanelDevice(d)}
              onOpenUpdateModal={openUpdateModalForDevice}
              onRefresh={loadAll}
            />
          )}

          {tab === 'firmware' && (
            <FirmwarePage
              firmware={firmware}
              onRefresh={loadAll}
            />
          )}

          {tab === 'analytics' && (
            <AnalyticsPage
              devices={devices}
              firmware={firmware}
            />
          )}

          {tab === 'settings' && (
            <div className="p-8 max-w-3xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Mission Control Settings</h3>
                <p className="text-sm text-slate-500">Configure WebSocket gateway parameters, heartbeat timeouts, and telemetry retention.</p>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">WebSocket Transport Endpoint</div>
                      <div className="text-xs text-slate-400">ws://localhost:8765/ws/dashboard</div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-xs font-bold">Active</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">Heartbeat Timeout Threshold</div>
                      <div className="text-xs text-slate-400">Mark node offline after missing 3 consecutive heartbeats (15s)</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">15,000 ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

      {/* Device Telemetry Inspection Overlay Modal */}
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
