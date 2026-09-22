import React, { useState, useEffect } from 'react'
import type { FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  firmware: FirmwareVersion[]
  initialVersionA?: string
  initialVersionB?: string
  onClose: () => void
}

export function FirmwareDiffModal({
  firmware,
  initialVersionA = 'v1.0.0',
  initialVersionB = 'v1.2.0',
  onClose,
}: Props) {
  const [verA, setVerA] = useState(initialVersionA)
  const [verB, setVerB] = useState(initialVersionB)
  const [codeA, setCodeA] = useState('')
  const [codeB, setCodeB] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadCodes() {
      setLoading(true)
      try {
        const [resA, resB] = await Promise.all([
          api.get(`/api/firmware/${verA}/code`),
          api.get(`/api/firmware/${verB}/code`),
        ])
        setCodeA(resA.code || '')
        setCodeB(resB.code || '')
      } catch (err) {
        console.error('Failed to load firmware code diff', err)
      } finally {
        setLoading(false)
      }
    }
    loadCodes()
  }, [verA, verB])

  const linesA = codeA.split('\n')
  const linesB = codeB.split('\n')
  const maxLines = Math.max(linesA.length, linesB.length)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <div>
              <h2 className="text-base font-bold text-slate-800 font-mono">Arduino C++ Firmware Diff Inspector</h2>
              <p className="text-xs text-slate-400 font-mono">Side-by-side firmware source comparison</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Version selectors bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500">Base Version:</span>
            <select
              value={verA}
              onChange={e => setVerA(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              {firmware.map(f => (
                <option key={f.version} value={f.version}>{f.version}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-slate-400 font-bold">VS</div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500">Target Version:</span>
            <select
              value={verB}
              onChange={e => setVerB(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1 font-mono text-xs font-bold text-cyan-700 focus:outline-none focus:border-cyan-500"
            >
              {firmware.map(f => (
                <option key={f.version} value={f.version}>{f.version}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
              + Changes in {verB}
            </span>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center font-mono text-slate-400 animate-pulse">Loading firmware code...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column: Version A */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-mono text-xs font-bold text-slate-700 flex justify-between">
                  <span>{verA} (Baseline)</span>
                  <span className="text-slate-400">{linesA.length} lines</span>
                </div>
                <div className="p-3 font-mono text-xs overflow-x-auto divide-y divide-slate-100">
                  {Array.from({ length: maxLines }).map((_, i) => {
                    const line = linesA[i]
                    const other = linesB[i]
                    const isDiff = line !== other
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 py-0.5 px-2 rounded ${
                          isDiff && line !== undefined ? 'bg-rose-50/70 text-rose-900 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span className="text-slate-300 select-none w-6 text-right shrink-0">{i + 1}</span>
                        <pre className="whitespace-pre overflow-x-auto">{line ?? ''}</pre>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Version B */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-cyan-50 border-b border-cyan-100 font-mono text-xs font-bold text-cyan-800 flex justify-between">
                  <span>{verB} (Target Release)</span>
                  <span className="text-cyan-600">{linesB.length} lines</span>
                </div>
                <div className="p-3 font-mono text-xs overflow-x-auto divide-y divide-slate-100">
                  {Array.from({ length: maxLines }).map((_, i) => {
                    const line = linesB[i]
                    const other = linesA[i]
                    const isDiff = line !== other
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 py-0.5 px-2 rounded ${
                          isDiff && line !== undefined ? 'bg-emerald-50/80 text-emerald-900 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span className="text-slate-300 select-none w-6 text-right shrink-0">{i + 1}</span>
                        <pre className="whitespace-pre overflow-x-auto">{line ?? ''}</pre>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <span className="text-xs font-mono text-slate-500">
            Source checked against flash partition table
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
