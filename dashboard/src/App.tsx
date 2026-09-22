import React, { useState, useEffect, useCallback } from 'react'
import type { Device, Group, FirmwareVersion, LogEntry, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { FleetGrid } from './pages/FleetGrid'
import { FirmwarePage } from './pages/FirmwarePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { LogsPage } from './pages/LogsPage'
import { ConfigPage } from './pages/ConfigPage'
import { DevicePanel } from './components/DevicePanel'
import { BatchOTAModal } from './components/BatchOTAModal'
import { CanaryComparisonModal } from './components/CanaryComparisonModal'
import { FirmwareDiffModal } from './components/FirmwareDiffModal'
import { DeviceSettingsModal } from './components/DeviceSettingsModal'
import './index.css'

type Tab = 'fleet' | 'firmware' | 'analytics' | 'logs' | 'config'

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

  // Modals state
  const [settingsDevice, setSettingsDevice] = useState<Device | null>(null)
  const [diffModal, setDiffModal] = useState<{ open: boolean; verA: string; verB: string }>({
    open: false,
    verA: 'v1.0.0',
    verB: 'v1.2.0',
  })
  const [canaryModal, setCanaryModal] = useState<{ open: boolean; canaryId: string; version: string }>({
    open: false,
    canaryId: '',
    version: 'v1.2.0',
  })
  const [rollbackAlert, setRollbackAlert] = useState<{ id: string; ver: string; time: string } | null>(null)

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

  useEffect(() => {
    loadAll()
  }, [loadAll])

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
  const offlineCount = devices.filter(d => !d.online).length
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

  const handleUpdateGroup = (groupName: string) => {
    const groupDevs = devices.filter(d => d.group === groupName).map(d => d.id)
    if (groupDevs.length > 0) {
      setSelectedIds(new Set(groupDevs))
      setShowBatch(true)
    }
  }

  const handleSaveDeviceSettings = async (
    deviceId: string,
    data: { name?: string; group?: string; heartbeat_rate?: number }
  ) => {
    await api.patch(`/api/devices/${deviceId}`, data)
    await loadAll()
  }

  const handlePromoteCanary = async () => {
    const targetVer = canaryModal.version
    const remainingIds = devices.filter(d => d.id !== canaryModal.canaryId).map(d => d.id)
    if (remainingIds.length > 0) {
      await api.post('/api/ota/push', { device_ids: remainingIds, version: targetVer })
    }
    await loadAll()
  }

  const handleAbortCanary = async () => {
    const previousVer = 'v1.1.0'
    await api.post('/api/ota/rollback', { device_id: canaryModal.canaryId, version: previousVer })
    await loadAll()
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-mono rounded-lg transition-colors font-medium ${
      tab === t
        ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Self-healing alert banner if active */}
      {rollbackAlert && (
        <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-mono font-bold shadow-md animate-slide-in">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span>
              [SELF-HEALING AUTO-ROLLBACK]: Watchdog panic prevented on node{' '}
              <strong>{rollbackAlert.id}</strong>. Reverted to stable{' '}
              <strong>{rollbackAlert.ver}</strong> at {rollbackAlert.time}.
            </span>
          </div>
          <button
            onClick={() => setRollbackAlert(null)}
            className="text-white hover:text-amber-100 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

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
            {(['fleet', 'firmware', 'analytics', 'logs', 'config'] as Tab[]).map(t => (
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
          <div
            className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              connected
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                : 'border-rose-300 text-rose-700 bg-rose-50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {connected ? 'Live' : 'Offline'}
          </div>

          {/* Clock */}
          <span className="text-xs font-mono text-slate-500 font-medium">
            {now.toLocaleTimeString()}
          </span>

          {/* Batch push button */}
          {selectedIds.size >= 1 && (
            <button
              onClick={() => setShowBatch(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-sm rounded-lg font-bold transition-colors shadow-xs"
            >
              ⬆ Push OTA ({selectedIds.size})
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {tab === 'fleet' && (
          <aside className="w-56 border-r border-slate-200 bg-white p-4 shrink-0 overflow-y-auto">
            <div className="mb-5">
              <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Groups
              </div>
              <button
                onClick={() => setGroupFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors mb-1 ${
                  !groupFilter
                    ? 'bg-cyan-50 text-cyan-800 font-bold border-l-2 border-cyan-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                All Devices ({devices.length})
              </button>
              {groups.map(g => (
                <button
                  key={g.name}
                  onClick={() => setGroupFilter(groupFilter === g.name ? null : g.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors mb-1 ${
                    groupFilter === g.name
                      ? 'bg-cyan-50 text-cyan-800 font-bold border-l-2 border-cyan-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {g.name} ({g.device_count})
                </button>
              ))}
            </div>

            <div className="mb-4">
              <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Firmware
              </div>
              {firmware.map(fw => (
                <div
                  key={fw.version}
                  className="flex justify-between px-3 py-1.5 text-xs font-mono rounded hover:bg-slate-50"
                >
                  <span
                    className={
                      fw.version === latestFw ? 'text-amber-700 font-bold' : 'text-slate-700'
                    }
                  >
                    {fw.version}
                  </span>
                  <span className="text-slate-400 font-semibold">{fw.device_count}</span>
                </div>
              ))}
            </div>

            {/* Quick Actions in Sidebar */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Tools
              </div>
              <button
                onClick={() =>
                  setDiffModal({ open: true, verA: 'v1.0.0', verB: 'v1.2.0' })
                }
                className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-mono text-slate-700 font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>🔍</span> C++ Diff Viewer
              </button>
              <button
                onClick={() => {
                  if (devices[0]) {
                    setSelectedIds(new Set([devices[0].id]))
                    setShowBatch(true)
                  }
                }}
                className="w-full text-left px-3 py-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-mono text-rose-800 font-bold transition-colors flex items-center gap-1.5 border border-rose-200"
              >
                <span>🛡️</span> Fault-Tolerance Test
              </button>
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
              onOpenDevice={d => setPanelDevice(d)}
              onOpenSettings={d => setSettingsDevice(d)}
              onUpdateGroup={handleUpdateGroup}
            />
          )}
          {tab === 'firmware' && (
            <FirmwarePage
              firmware={firmware}
              onRefresh={loadAll}
              onOpenDiff={(verA, verB) => setDiffModal({ open: true, verA, verB })}
              onRunFaultTest={faultyVer => {
                if (devices[0]) {
                  setSelectedIds(new Set([devices[0].id]))
                  setShowBatch(true)
                }
              }}
            />
          )}
          {tab === 'analytics' && <AnalyticsPage devices={devices} firmware={firmware} />}
          {tab === 'logs' && <LogsPage liveLogs={liveLogs} devices={devices} />}
          {tab === 'config' && <ConfigPage groups={groups} devices={devices} />}
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

      {/* Batch OTA Pipeline Modal */}
      {showBatch && (
        <BatchOTAModal
          deviceIds={Array.from(selectedIds)}
          devices={devices}
          firmware={firmware}
          onClose={() => {
            setShowBatch(false)
            setSelectedIds(new Set())
          }}
          onOpenCanary={(canaryId, version) =>
            setCanaryModal({ open: true, canaryId, version })
          }
          onAutoRollbackTriggered={(id, ver) =>
            setRollbackAlert({ id, ver, time: new Date().toLocaleTimeString() })
          }
        />
      )}

      {/* Canary Comparison Modal */}
      {canaryModal.open && (
        <CanaryComparisonModal
          canaryDeviceId={canaryModal.canaryId}
          targetVersion={canaryModal.version}
          devices={devices}
          onPromote={handlePromoteCanary}
          onAbort={handleAbortCanary}
          onClose={() => setCanaryModal({ open: false, canaryId: '', version: 'v1.2.0' })}
        />
      )}

      {/* Firmware Diff Modal */}
      {diffModal.open && (
        <FirmwareDiffModal
          firmware={firmware}
          initialVersionA={diffModal.verA}
          initialVersionB={diffModal.verB}
          onClose={() => setDiffModal({ open: false, verA: 'v1.0.0', verB: 'v1.2.0' })}
        />
      )}

      {/* Device Settings Modal */}
      {settingsDevice && (
        <DeviceSettingsModal
          device={settingsDevice}
          groups={groups}
          onSave={handleSaveDeviceSettings}
          onClose={() => setSettingsDevice(null)}
        />
      )}
    </div>
  )
}
