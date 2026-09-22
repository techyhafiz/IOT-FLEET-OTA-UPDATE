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
      <h2 className="font-mono font-bold text-lg text-slate-200 mb-6">⚙ Configuration</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config push */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-mono text-slate-400 mb-4">PUSH CONFIG TO DEVICES</h3>

          {/* JSON editor */}
          <div className="mb-3">
            <label className="text-xs font-mono text-slate-400 mb-1 block">Config JSON</label>
            <textarea
              value={configJson}
              onChange={e => { setConfigJson(e.target.value); validateJson(e.target.value) }}
              rows={8}
              className={`w-full bg-slate-900 border rounded-lg px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none resize-none ${
                jsonError ? 'border-red-600 focus:border-red-500' : 'border-slate-600 focus:border-cyan-500'
              }`}
            />
            {jsonError && <p className="text-xs text-red-400 font-mono mt-1">⚠ {jsonError}</p>}
          </div>

          {/* Device selection */}
          <div className="mb-3">
            <label className="text-xs font-mono text-slate-400 mb-2 block">Target Devices</label>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {devices.map(d => (
                <label key={d.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(d.id)}
                    onChange={() => toggleDevice(d.id)} className="accent-cyan-500"/>
                  <span className="font-mono text-xs text-slate-300">{d.id}</span>
                  <span className="text-xs text-slate-600 font-mono">{d.group}</span>
                  <span className={`ml-auto text-xs font-mono ${d.online ? 'text-green-400' : 'text-red-400'}`}>
                    {d.online ? '●' : '○'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {pushed && (
            <div className="mb-3 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-xs font-mono text-green-400">
              ✅ Config pushed to {selected.length} device{selected.length !== 1 ? 's' : ''}
            </div>
          )}

          <button
            onClick={pushConfig}
            disabled={pushing || !!jsonError || selected.length === 0}
            className="w-full py-2.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white font-mono text-sm rounded-lg transition-colors"
          >
            {pushing ? 'Pushing...' : `⬆ Push Config (${selected.length} devices)`}
          </button>
        </div>

        {/* Groups management */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-mono text-slate-400 mb-4">GROUPS</h3>
          <div className="space-y-2 mb-4">
            {groups.map(g => (
              <div key={g.name} className="flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-lg">
                <span className="font-mono text-sm text-slate-200">{g.name}</span>
                <span className="font-mono text-xs text-slate-500">{g.device_count} devices</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newGroup}
              onChange={e => setNewGroup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createGroup()}
              placeholder="new-group-name"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button onClick={createGroup}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-mono text-sm rounded-lg transition-colors">
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
