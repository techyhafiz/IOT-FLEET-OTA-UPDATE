import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Device, Group, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { useDeviceSimulator, getSimControls, logBus, type LocalLogEntry } from './hooks/useDeviceSimulator'
import { DeviceGrid } from './pages/DeviceGrid'
import { DeviceDetail } from './pages/DeviceDetail'
import './index.css'

/** Mounts one simulation "CPU" per device — stays alive across navigation. */
function DeviceSimulationWorker({ device }: { device: Device }) {
  const enabled = device.online !== false
  const logQueueRef = useRef<LocalLogEntry[]>([])

  useDeviceSimulator(
    device,
    enabled,
    useCallback((msg: string, level?: 'INFO' | 'WARN' | 'ERROR') => {
      // The hook emits to logBus itself; this callback is a safety net for
      // ordering — keep it cheap.
      logQueueRef.current = []
      void msg
      void level
    }, [])
  )
  return null
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [connected, setConnected] = useState(false)

  const loadDevices = useCallback(async () => {
    try {
      const [devs, grps] = await Promise.all([
        api.get('/api/devices'),
        api.get('/api/groups'),
      ])
      setDevices(devs)
      setGroups(grps)
    } catch {
      // Backend not up yet — WS reconnect indicator will show state
    }
  }, [])

  useEffect(() => { loadDevices() }, [loadDevices])

  const handleWsEvent = useCallback((event: WSEvent) => {
    setDevices(prev => {
      switch (event.type) {
        case 'device_registered':
          if (prev.find(d => d.id === event.device_id)) {
            // Re-registration: update in place (state sync after reconnect)
            return prev.map(d => d.id === event.device_id ? { ...d, ...(event.payload as Partial<Device>) } : d)
          }
          return [...prev, event.payload as Device]
        case 'device_removed':
          return prev.filter(d => d.id !== event.device_id)
        case 'device_status':
        case 'ota_started':
        case 'ota_progress':
        case 'ota_complete':
          return prev.map(d =>
            d.id === event.device_id ? { ...d, ...(event.payload as Partial<Device>) } : d
          )
        case 'firmware_added':
          // New firmware uploaded on PC-A — nothing to change device-side
          return prev
        default:
          return prev
      }
    })
  }, [])

  const { connected: wsConnected } = useWebSocket(handleWsEvent)

  useEffect(() => { setConnected(wsConnected) }, [wsConnected])

  const addDevice = useCallback(async (newDevice: Device) => {
    setDevices(prev => prev.find(d => d.id === newDevice.id) ? prev : [...prev, newDevice])
  }, [])

  const removeDevice = useCallback(async (id: string) => {
    await api.delete(`/api/devices/${id}`)
    setDevices(prev => prev.filter(d => d.id !== id))
  }, [])

  return (
    <BrowserRouter basename="/simulator">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Top bar */}
        <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <h1 className="text-lg font-bold text-cyan-700 font-mono">ESP32 Device Simulator</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>← PC-A Fleet Dashboard</span>
            </a>
            <span className="text-sm text-slate-500 font-mono font-medium">
              {devices.filter(d => d.online !== false).length}/{devices.length} online
            </span>
            <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border ${
              connected ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}/>
              {connected ? 'Connected to PC-A' : 'Reconnecting...'}
            </div>
          </div>
        </header>

        {/* Persistent per-device simulation workers */}
        {devices.map(device => (
          <DeviceSimulationWorker key={device.id} device={device} />
        ))}

        <Routes>
          <Route path="/" element={
            <DeviceGrid
              devices={devices}
              groups={groups}
              onAdd={addDevice}
              onRemove={removeDevice}
              onRefreshGroups={() => api.get('/api/groups').then(setGroups)}
            />
          }/>
          <Route path="/device/:id" element={
            <DeviceDetail devices={devices}/>
          }/>
        </Routes>
      </div>
    </BrowserRouter>
  )
}
