import React, { useState } from 'react'
import type { FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  firmware: FirmwareVersion[]
  onRefresh: () => void
  onOpenDiff?: (verA: string, verB: string) => void
  onRunFaultTest?: (faultyVersion: string) => void
}

export function FirmwarePage({ firmware, onRefresh, onOpenDiff, onRunFaultTest }: Props) {
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

  const latestFw = firmware[0]?.version

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-800">📦 Firmware Catalog & Release Ledger</h2>
          <p className="text-xs font-mono text-slate-500 mt-0.5">Preloaded builds, binary checksums, and C++ source code diffs</p>
        </div>
        <div className="flex gap-3">
          {firmware.length >= 2 && onOpenDiff && (
            <button
              onClick={() => onOpenDiff(firmware[1]?.version || 'v1.0.0', firmware[0]?.version || 'v1.2.0')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <span>🔍</span> Inspect C++ Diff
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-lg font-bold shadow-xs transition-colors"
          >
            + Upload New Binary
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {firmware.map((fw, i) => {
          const isLatest = fw.version === latestFw && !fw.is_faulty
          const isFaulty = fw.is_faulty || fw.version.includes('faulty')

          return (
            <div
              key={fw.version}
              className={`bg-white border rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-xs transition-all ${
                isFaulty
                  ? 'border-rose-200 bg-rose-50/20'
                  : isLatest
                  ? 'border-amber-300 ring-1 ring-amber-200/50'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-lg text-slate-900">{fw.version}</span>
                  {isLatest && (
                    <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      ACTIVE FLEET RELEASE
                    </span>
                  )}
                  {isFaulty && (
                    <span className="text-[11px] bg-rose-50 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                      ⚠️ FAULT TOLERANCE SIMULATION BUILD
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-mono leading-relaxed">{fw.changelog}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                  <span>📅 {fw.date}</span>
                  <span>📦 {Math.round(fw.size / 1024)} KB</span>
                  <span className="text-cyan-700 font-semibold">
                    🔌 {fw.device_count ?? 0} node{(fw.device_count ?? 0) !== 1 ? 's' : ''} running
                  </span>
                  {fw.sha256 && (
                    <span className="text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                      SHA-256: {fw.sha256.slice(0, 16)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-start shrink-0">
                {onOpenDiff && (
                  <button
                    onClick={() => onOpenDiff('v1.0.0', fw.version)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-xs font-semibold rounded-lg transition-colors"
                  >
                    Diff vs v1.0
                  </button>
                )}
                {isFaulty && onRunFaultTest && (
                  <button
                    onClick={() => onRunFaultTest(fw.version)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    ⚡ Test Auto-Rollback
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-mono font-bold text-cyan-700 text-base">+ New Firmware Version</h3>
            <div>
              <label className="text-xs font-mono font-bold text-slate-500 mb-1 block">Version (e.g. v1.3.0)</label>
              <input
                value={newVersion}
                onChange={e => setNewVersion(e.target.value)}
                placeholder="v1.3.0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-mono font-bold text-slate-500 mb-1 block">Changelog</label>
              <textarea
                value={newChangelog}
                onChange={e => setNewChangelog(e.target.value)}
                rows={3}
                placeholder="What changed in this version..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-mono text-sm rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !newVersion}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-sm rounded-lg font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Creating...' : '+ Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
