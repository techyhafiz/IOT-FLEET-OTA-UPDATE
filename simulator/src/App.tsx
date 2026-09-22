import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Device, Group, WSEvent } from '@shared/types'
import { useWebSocket, api } from './hooks/useWebSocket'
import { useDeviceSimulator } from './hooks/useDeviceSimulator'
import { DeviceGrid } from './pages/DeviceGrid'
import { DeviceDetail } from './pages/DeviceDetail'
import './index.css'

function DeviceSimulationWorker({ device }: { device: Device }) {
  useDeviceSimulator(device, device.online !== false)
  return null
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  const loadDevices = useCallback(async () => {
    const [devs, grps] = await Promise.all([
      api.get('/api/devices'),
      api.get('/api/groups'),
    ])
    setDevices(devs)
    setGroups(grps)
  }, [])

  useEffect(() => { loadDevices() }, [loadDevices])

  const handleWsEvent = useCallback((event: WSEvent) => {
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
  }, [])

  const { connected } = useWebSocket(handleWsEvent)

  const addDevice = useCallback(async (newDevice: Device) => {
    setDevices(prev => [...prev, newDevice])
  }, [])

  const removeDevice = useCallback(async (id: string) => {
    await api.delete(`/api/devices/${id}`)
    setDevices(prev => prev.filter(d => d.id !== id))
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f172a] text-slate-200">
        {/* Top bar */}
        <header className="border-b border-slate-700 bg-slate-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-lg font-bold text-cyan-400 font-mono">ESP32 Device Simulator</h1>
              <p className="text-xs text-slate-500">PC-B — Device Farm</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 font-mono">{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
            <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border ${
              connected ? 'border-green-700 bg-green-900/30 text-green-400' : 'border-red-700 bg-red-900/30 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}/>
              {connected ? 'Connected to PC-A' : 'Reconnecting...'}
            </div>
          </div>
        </header>

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
            <DeviceDetail devices={devices} onDeviceUpdate={(updated) => {
              setDevices(prev => prev.map(d => d.id === updated.id ? updated : d))
            }}/>
          }/>
        </Routes>
      </div>
    </BrowserRouter>
  )
}
