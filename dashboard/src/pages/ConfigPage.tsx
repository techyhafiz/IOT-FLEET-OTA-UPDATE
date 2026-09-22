import React, { useState } from 'react'
import type { Device, Group } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  groups: Group[]
  devices: Device[]
}

export function ConfigPage({ groups, devices }: Props) {
  const [configJson, setConfigJson] = useState('{\n  "poll_interval": 5,\n  "log_level": "INFO",\n  "heartbeat_ms": 2000\n}')
  const [selected, setSelected] = useState<string[]>([])
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pushed, setPushed] = useState(false)
  const [newGroup, setNewGroup] = useState('')

  function validateJson(s: string) {
    try { JSON.parse(s); setJsonError(null) }
    catch (e) { setJsonError(String(e)) }
  }

  function toggleDevice(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function pushConfig() {
    if (jsonError || selected.length === 0) return
    setPushing(true)
    setPushed(false)
    const config = JSON.parse(configJson)
    await api.post('/api/config/push', { device_ids: selected, config })
    setPushed(true)
    setPushing(false)
    setTimeout(() => setPushed(false), 3000)
  }

  async function createGroup() {
    if (!newGroup.trim()) return
    await api.post('/api/groups', { name: newGroup.trim() })
    setNewGroup('')
    window.location.reload()
  }

  return (
    <div className="p-6">
      <h2 className="font-mono font-bold text-lg text-slate-800 mb-6">⚙ Configuration</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config push */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold text-slate-400 mb-4 uppercase tracking-wider">PUSH CONFIG TO DEVICES</h3>

          {/* JSON editor */}
          <div className="mb-4">
            <label className="text-xs font-mono font-bold text-slate-600 mb-1.5 block">Config JSON</label>
            <textarea
              value={configJson}
              onChange={e => { setConfigJson(e.target.value); validateJson(e.target.value) }}
              rows={8}
              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none resize-none ${
                jsonError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-cyan-500'
              }`}
            />
            {jsonError && <p className="text-xs text-rose-600 font-mono mt-1 font-medium">⚠ {jsonError}</p>}
          </div>

          {/* Device selection */}
          <div className="mb-4">
            <label className="text-xs font-mono font-bold text-slate-600 mb-2 block">Target Devices</label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {devices.map(d => (
                <label key={d.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selected.includes(d.id)}
                    onChange={() => toggleDevice(d.id)} className="accent-cyan-600"/>
                  <span className="font-mono text-xs font-bold text-slate-800">{d.id}</span>
                  <span className="text-xs text-slate-500 font-mono font-medium">{d.group}</span>
                  <span className={`ml-auto text-xs font-mono font-bold ${d.online ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {d.online ? '● Online' : '○ Offline'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {pushed && (
            <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-lg px-3.5 py-2 text-xs font-mono text-emerald-800 font-bold">
              ✅ Config pushed to {selected.length} device{selected.length !== 1 ? 's' : ''}
            </div>
          )}

          <button
            onClick={pushConfig}
            disabled={pushing || !!jsonError || selected.length === 0}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-mono text-sm rounded-lg font-bold shadow-xs transition-colors"
          >
            {pushing ? 'Pushing...' : `⬆ Push Config (${selected.length} devices)`}
          </button>
        </div>

        {/* Groups management */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold text-slate-400 mb-4 uppercase tracking-wider">GROUPS</h3>
          <div className="space-y-2 mb-4">
            {groups.map(g => (
              <div key={g.name} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-mono text-sm font-bold text-slate-800">{g.name}</span>
                <span className="font-mono text-xs text-slate-500 font-medium">{g.device_count} devices</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newGroup}
              onChange={e => setNewGroup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createGroup()}
              placeholder="new-group-name"
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
            />
            <button onClick={createGroup}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-mono text-sm font-bold rounded-lg transition-colors shadow-2xs">
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
