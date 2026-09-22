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
        <h2 className="text-lg font-bold font-mono text-slate-800">📦 Firmware Versions</h2>
        <button onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-sm rounded-lg font-bold shadow-xs transition-colors">
          + Upload Firmware
        </button>
      </div>

      <div className="space-y-3">
        {firmware.map((fw, i) => (
          <div key={fw.version}
            className={`bg-white border rounded-xl p-5 flex items-start justify-between shadow-xs transition-all ${
              i === 0 ? 'border-amber-300 ring-1 ring-amber-200/50' : 'border-slate-200'
            }`}>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="font-mono font-bold text-lg text-slate-900">{fw.version}</span>
                {i === 0 && <span className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">LATEST</span>}
              </div>
              <p className="text-sm text-slate-600 font-mono mb-3">{fw.changelog}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                <span>📅 {fw.date}</span>
                <span>📦 {Math.round(fw.size / 1024)} KB</span>
                <span className="text-cyan-700 font-semibold">🔌 {fw.device_count ?? 0} device{(fw.device_count ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-mono font-bold text-cyan-700 text-base">+ New Firmware Version</h3>
            <div>
              <label className="text-xs font-mono font-bold text-slate-500 mb-1 block">Version (e.g. v1.3.0)</label>
              <input value={newVersion} onChange={e => setNewVersion(e.target.value)}
                placeholder="v1.3.0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono font-bold text-slate-500 mb-1 block">Changelog</label>
              <textarea value={newChangelog} onChange={e => setNewChangelog(e.target.value)}
                rows={3} placeholder="What changed in this version..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500 resize-none"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowUpload(false)}
                className="flex-1 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-mono text-sm rounded-lg font-semibold transition-colors">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !newVersion}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-sm rounded-lg font-bold shadow-xs disabled:opacity-50 transition-colors">
                {uploading ? 'Creating...' : '+ Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
