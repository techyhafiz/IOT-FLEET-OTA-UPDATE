import React, { useState } from 'react'
import type { Device, FirmwareVersion } from '@shared/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  devices: Device[]
  initialSelectedIds: Set<string>
  firmware: FirmwareVersion[]
  onDeploy: (targets: { deviceId: string; version: string; isRollback?: boolean }[]) => Promise<void>
}

export function UpdateFirmwareModal({
  isOpen,
  onClose,
  devices,
  initialSelectedIds,
  firmware,
  onDeploy,
}: Props) {
  // CRITICAL: all hooks must run unconditionally, before any early return —
  // otherwise React throws "Rendered fewer hooks than during the previous render"
  // and the whole dashboard crashes when this modal opens/closes.
  const targetDevices = devices.filter(d =>
    initialSelectedIds.size > 0 ? initialSelectedIds.has(d.id) : true
  )

  const latestVersion = firmware[0]?.version || 'v1.2.0'

  // Per-device selection checkbox
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    targetDevices.forEach(d => {
      map[d.id] = true
    })
    return map
  })

  // Per-device chosen target version
  const [targetMap, setTargetMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    targetDevices.forEach(d => {
      map[d.id] = d.firmware === latestVersion ? (firmware[1]?.version || latestVersion) : latestVersion
    })
    return map
  })

  // Rollback view toggle per device
  const [rollbackMap, setRollbackMap] = useState<Record<string, boolean>>({})

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployProgress, setDeployProgress] = useState(0)
  const [completed, setCompleted] = useState(false)

  if (!isOpen) return null

  // Rest of the render body follows…
  return renderModal({
    devices: targetDevices,
    firmware,
    latestVersion,
    selectedMap,
    targetMap,
    rollbackMap,
    isDeploying,
    deployProgress,
    completed,
    selectedCount: Object.values(selectedMap).filter(Boolean).length,
    onClose,
    toggleSelect: (id: string) => setSelectedMap(prev => ({ ...prev, [id]: !prev[id] })),
    toggleRollback: (id: string) => setRollbackMap(prev => ({ ...prev, [id]: !prev[id] })),
    setTargetVersion: (id: string, ver: string) => setTargetMap(prev => ({ ...prev, [id]: ver })),
    handleUpdateAll: async () => {
      const toUpdate = targetDevices
        .filter(d => selectedMap[d.id])
        .map(d => ({
          deviceId: d.id,
          version: targetMap[d.id] || latestVersion,
          isRollback: rollbackMap[d.id],
        }))

      if (toUpdate.length === 0) return

      setIsDeploying(true)
      setDeployProgress(15)

      const timer = setInterval(() => {
        setDeployProgress(p => {
          if (p >= 90) {
            clearInterval(timer)
            return 90
          }
          return p + 20
        })
      }, 400)

      try {
        await onDeploy(toUpdate)
        setDeployProgress(100)
        setCompleted(true)
        setTimeout(() => {
          setIsDeploying(false)
          onClose()
        }, 1200)
      } catch (err) {
        console.error(err)
        setIsDeploying(false)
      } finally {
        clearInterval(timer)
      }
    },
  })
}

// ─── Extracted render (keeps hook order above untouched) ─────────────────────

interface RenderProps {
  devices: Device[]
  firmware: FirmwareVersion[]
  latestVersion: string
  selectedMap: Record<string, boolean>
  targetMap: Record<string, string>
  rollbackMap: Record<string, boolean>
  isDeploying: boolean
  deployProgress: number
  completed: boolean
  selectedCount: number
  onClose: () => void
  toggleSelect: (id: string) => void
  toggleRollback: (id: string) => void
  setTargetVersion: (id: string, ver: string) => void
  handleUpdateAll: () => Promise<void>
}

function renderModal(p: RenderProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="font-mono font-bold text-slate-900 text-base">Update Firmware Deployment</h3>
          </div>
          <button
            onClick={p.onClose}
            disabled={p.isDeploying}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* In-Flight Deployment Progress */}
        {p.isDeploying && (
          <div className="bg-cyan-50 border-b border-cyan-200 px-6 py-3 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-900 font-bold">
              <span>{p.completed ? '✅ Deployment Verified & Completed' : 'Flashing Firmware to Selected Nodes...'}</span>
              <span>{p.deployProgress}%</span>
            </div>
            <div className="w-full h-2 bg-cyan-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                style={{ width: `${p.deployProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Table of Devices */}
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] bg-slate-50/70">
                <th className="py-2.5 px-3 rounded-l-lg">Select</th>
                <th className="py-2.5 px-3">Device</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Current FW</th>
                <th className="py-2.5 px-3 rounded-r-lg">Update Firmware / Rollback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {p.devices.map(d => {
                const isSelected = p.selectedMap[d.id] ?? false
                const isRollback = p.rollbackMap[d.id] ?? false
                const currentFw = d.firmware
                const selectedTarget = p.targetMap[d.id] || p.latestVersion
                const olderVersions = p.firmware.filter(fw => fw.version !== currentFw)

                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-cyan-50/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => p.toggleSelect(d.id)}
                        disabled={p.isDeploying}
                        className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>

                    {/* Device ID and Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{d.id}</div>
                      {d.name && d.name !== d.id && (
                        <div className="text-[11px] text-slate-400 font-normal">{d.name}</div>
                      )}
                    </td>

                    {/* Status symbol */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        d.online
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${d.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {d.online ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    {/* Current Firmware */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700">
                        {d.firmware}
                      </span>
                    </td>

                    {/* Update / Rollback column */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {!isRollback ? (
                          <>
                            <select
                              value={selectedTarget}
                              onChange={e => p.setTargetVersion(d.id, e.target.value)}
                              disabled={p.isDeploying || !isSelected}
                              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-semibold"
                            >
                              {p.firmware.map(fw => (
                                <option key={fw.version} value={fw.version}>
                                  {fw.version} {fw.version === p.latestVersion ? '(Latest)' : ''}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => p.toggleRollback(d.id)}
                              disabled={p.isDeploying || !isSelected}
                              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors font-bold disabled:opacity-40"
                              title="Switch to Rollback Mode"
                            >
                              ↩ Rollback
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-800 text-[11px] font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                                Rollback To:
                              </span>
                              <select
                                value={selectedTarget}
                                onChange={e => p.setTargetVersion(d.id, e.target.value)}
                                disabled={p.isDeploying || !isSelected}
                                className="bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg px-2 py-1 focus:outline-none font-bold"
                              >
                                {olderVersions.map(fw => (
                                  <option key={fw.version} value={fw.version}>
                                    {fw.version} (Prev)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => p.toggleRollback(d.id)}
                              disabled={p.isDeploying}
                              className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-800 underline"
                            >
                              Normal
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">
            <strong>{p.selectedCount}</strong> device{p.selectedCount !== 1 ? 's' : ''} selected for deployment
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={p.onClose}
              disabled={p.isDeploying}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={p.handleUpdateAll}
              disabled={p.isDeploying || p.selectedCount === 0}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {p.isDeploying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating Devices...
                </>
              ) : (
                <>
                  <span>⚡</span> Select and Update All
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
