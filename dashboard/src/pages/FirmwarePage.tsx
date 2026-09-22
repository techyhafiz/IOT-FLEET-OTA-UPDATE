import React, { useState } from 'react'
import type { FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  firmware: FirmwareVersion[]
  onRefresh: () => void
}

export function FirmwarePage({ firmware, onRefresh }: Props) {
  const [showUpload, setShowUpload] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [newChangelog, setNewChangelog] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!newVersion) return
    setUploading(true)
    await api.post(`/api/firmware?version=${encodeURIComponent(newVersion)}&changelog=${encodeURIComponent(newChangelog)}`, {})
    setUploading(false)
    setShowUpload(false)
    setNewVersion('')
    setNewChangelog('')
    onRefresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold font-mono text-slate-200">📦 Firmware Versions</h2>
        <button onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-sm rounded-lg transition-colors">
          + Upload Firmware
        </button>
      </div>

      <div className="space-y-3">
        {firmware.map((fw, i) => (
          <div key={fw.version}
            className={`bg-slate-800 border rounded-xl p-5 flex items-start justify-between ${
              i === 0 ? 'border-amber-700' : 'border-slate-700'
            }`}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono font-bold text-lg text-white">{fw.version}</span>
                {i === 0 && <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-700 px-2 py-0.5 rounded font-mono">LATEST</span>}
              </div>
              <p className="text-sm text-slate-400 font-mono mb-2">{fw.changelog}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                <span>📅 {fw.date}</span>
                <span>📦 {Math.round(fw.size / 1024)} KB</span>
                <span className="text-cyan-400">🔌 {fw.device_count ?? 0} device{(fw.device_count ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-mono font-bold text-cyan-400">+ New Firmware Version</h3>
            <div>
              <label className="text-xs font-mono text-slate-400 mb-1 block">Version (e.g. v1.3.0)</label>
              <input value={newVersion} onChange={e => setNewVersion(e.target.value)}
                placeholder="v1.3.0"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 mb-1 block">Changelog</label>
              <textarea value={newChangelog} onChange={e => setNewChangelog(e.target.value)}
                rows={3} placeholder="What changed in this version..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpload(false)}
                className="flex-1 py-2 border border-slate-600 text-slate-400 font-mono text-sm rounded-lg">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !newVersion}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm rounded-lg disabled:opacity-50">
                {uploading ? 'Creating...' : '+ Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
