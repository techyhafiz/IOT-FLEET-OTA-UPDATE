import React, { useState, useRef, useEffect } from 'react'
import type { FirmwareVersion } from '@shared/types'
import { LedIndicator, LcdScreen } from '@shared/components'
import { api } from '../hooks/useWebSocket'

interface Props {
  firmware: FirmwareVersion[]
  onRefresh: () => void
}

interface PresetFw {
  id: string
  template: 'led' | 'lcd'
  name: string
  desc: string
  version: string
  targets: string[]
  gpio: Record<string, number>
  lcd: { row1: string; row2: string } | null
  dynamic: string | null
  code: string
}

/** Mock rows for dynamic LCD presets (ip / uptime rendered at runtime). */
const LCD_PREVIEW_ROWS: Record<string, { row1: string; row2: string }> = {
  ip: { row1: 'IP:192.168.1.42', row2: 'OTA:READY' },
  uptime: { row1: 'Uptime: 00:04:12', row2: 'SYS: ONLINE' },
}

/** Compact names for the quick-pick list, per demo script. */
const PRESET_LABELS: Record<string, string> = {
  LED_D0: 'LED D0',
  LED_D1: 'LED D1',
  LED_D2: 'LED D2',
  LED_D3: 'LED D3',
  LED_ALL_OFF: 'LED all-off (base)',
  LCD_BLANK: 'LCD blank (base)',
  LCD_GREETING: 'LCD Hello',
  LCD_IP: 'LCD IP & Signal',
  LCD_UPTIME: 'LCD IoT Subject',
}
const presetLabel = (p: PresetFw) => PRESET_LABELS[p.id] ?? p.name

export function FirmwarePage({ firmware, onRefresh }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [uploadTab, setUploadTab] = useState<'preset' | 'manual'>('preset')

  // Preset library (fetched live from the backend)
  const [presets, setPresets] = useState<PresetFw[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [editedCode, setEditedCode] = useState<string>('')
  const [codeDirty, setCodeDirty] = useState(false)

  // View code of an already-registered firmware
  const [viewCode, setViewCode] = useState<{ version: string; code: string } | null>(null)

  // Progress states
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'validating' | 'valid' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedPreset = presets.find(p => p.id === selectedPresetId) ?? null

  useEffect(() => {
    if (!showUploadModal) return
    api.get('/api/firmware/presets')
      .then((res: unknown) => setPresets((res as PresetFw[]) ?? []))
      .catch(() => setPresets([]))
  }, [showUploadModal])

  const handleSelectPreset = (p: PresetFw) => {
    setSelectedPresetId(p.id)
    setEditedCode(p.code)
    setCodeDirty(false)
    setNewVersion(p.version)
    setNewDescription(p.desc)
    setFileName(`${p.id.toLowerCase()}_${p.version}.cpp`)
    setFileContent(p.code)
  }

  const handleCodeEdited = (code: string) => {
    setEditedCode(code)
    setCodeDirty(code !== selectedPreset?.code)
    setFileContent(code)
  }

  const handleResetCode = () => {
    if (!selectedPreset) return
    setEditedCode(selectedPreset.code)
    setCodeDirty(false)
    setFileContent(selectedPreset.code)
  }

  const openCodeViewer = async (version: string) => {
    try {
      const res = await api.get(`/api/firmware/${version}/code`) as { version: string; code: string }
      setViewCode(res)
    } catch {
      setViewCode({ version, code: '// Failed to load source' })
    }
  }

  const handleDeleteFirmware = async (version: string) => {
    if (!window.confirm(`Delete firmware ${version} from the repository?`)) return
    try {
      const res = await api.delete(`/api/firmware/${version}`)
      if (res && typeof res === 'object' && 'detail' in res) {
        window.alert(String((res as { detail?: unknown }).detail))
        return
      }
      onRefresh()
    } catch {
      window.alert('Delete failed')
    }
  }

  const downloadUrl = (version: string) => `${api.base}/api/firmware/${version}/download`

  const handleFileSelected = (file: File) => {
    setSelectedPresetId(null)
    setFileName(file.name)
    const match = file.name.match(/v\d+\.\d+\.\d+/)
    if (match) {
      setNewVersion(match[0])
    } else if (!newVersion) {
      setNewVersion('v1.3.0')
    }

    if (!newDescription) {
      setNewDescription(`Release ${file.name} - Automated build with cryptographic validation.`)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setFileContent(e.target?.result as string)
    }
    reader.readAsText(file)
  }

  const startUploadAndValidate = async () => {
    if (!newVersion) return
    setIsProcessing(true)
    setUploadError('')
    setUploadPhase('uploading')
    setUploadProgress(20)

    try {
      if (uploadTab === 'manual' && fileInputRef.current?.files?.[0]) {
        await new Promise(r => setTimeout(r, 400))
        setUploadProgress(65)
        setUploadPhase('validating')
        await new Promise(r => setTimeout(r, 600))
        setUploadProgress(95)
        const formData = new FormData()
        formData.append('file', fileInputRef.current.files[0])
        formData.append('version', newVersion)
        formData.append('changelog', newDescription)
        const res = await api.upload('/api/firmware/upload', formData)
        if (res && typeof res === 'object' && 'detail' in res) {
          throw new Error(String((res as { detail?: unknown }).detail))
        }
      } else {
        // Preset (possibly hand-edited) or pasted source — upload the C source
        // itself; the backend compiles the behaviour out of the real code.
        const code = selectedPreset ? editedCode : (fileContent || '')
        if (!code.trim()) throw new Error('No code to upload — pick a preset or paste source.')
        await new Promise(r => setTimeout(r, 400))
        setUploadProgress(65)
        setUploadPhase('validating')
        await new Promise(r => setTimeout(r, 600))
        setUploadProgress(95)
        const res = await api.post('/api/firmware/upload-source', {
          version: newVersion,
          changelog: codeDirty
            ? `${selectedPreset?.name ?? 'Custom'} (edited)` || newDescription
            : newDescription || selectedPreset?.desc || '',
          filename: fileName || `${newVersion}.cpp`,
          code,
          size: code.length,
        })
        // FastAPI returns 422 with {detail} for rejected images (faulty etc.)
        if (res && typeof res === 'object' && 'detail' in res) {
          throw new Error(String((res as { detail?: unknown }).detail))
        }
      }

      setUploadProgress(100)
      setUploadPhase('valid')
      await new Promise(r => setTimeout(r, 700))

      onRefresh()
      setTimeout(() => {
        setShowUploadModal(false)
        setUploadPhase('idle')
        setUploadProgress(0)
        setIsProcessing(false)
        setFileName(null)
        setFileContent(null)
        setNewVersion('')
        setNewDescription('')
        setSelectedPresetId(null)
        setEditedCode('')
        setCodeDirty(false)
      }, 1000)
    } catch (err: unknown) {
      console.error(err)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setUploadPhase('error')
      setIsProcessing(false)
    }
  }

  const ledPresets = presets.filter(p => p.template === 'led')
  const lcdPresets = presets.filter(p => p.template === 'lcd')

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="text-lg font-bold font-mono text-slate-900">Firmware Repository</h2>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Verified firmware images, descriptions, release dates, and node counts
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <span>⬆</span> Add Firmware
        </button>
      </div>

      {/* Clean Table of Firmware */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase text-[11px]">
              <th className="py-3 px-4">Firmware Number</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Date / Time</th>
              <th className="py-3 px-4">Devices Having</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {firmware.map((fw, idx) => {
              const isLatest = idx === 0
              return (
                <tr key={fw.version} className="hover:bg-slate-50/70 transition-colors">
                  {/* Firmware Version */}
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{fw.version}</span>
                      {isLatest && (
                        <span className="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 px-1.5 py-0.2 rounded font-bold">
                          Latest
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-md">
                    {fw.changelog}
                  </td>

                  {/* Date/Time */}
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {fw.date}
                  </td>

                  {/* Devices having it */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                      {fw.device_count ?? 0} {fw.device_count === 1 ? 'device' : 'devices'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                      ✓ Valid
                    </span>
                  </td>

                  {/* View source + download + delete */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openCodeViewer(fw.version)}
                        className="text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-1 rounded-lg font-bold text-[11px] transition-colors"
                        title="View source"
                      >
                        {'</>'}
                      </button>
                      <a
                        href={downloadUrl(fw.version)}
                        download
                        className="text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg font-bold text-[11px] transition-colors"
                        title={`Download ${fw.version} source (.c file)`}
                      >
                        ⬇
                      </a>
                      {fw.device_count === 0 && (
                        <button
                          onClick={() => handleDeleteFirmware(fw.version)}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg font-bold text-[11px] transition-colors"
                          title={`Delete ${fw.version}`}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl p-6 space-y-4 shadow-2xl animate-scale-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-mono font-bold text-slate-900 text-base flex items-center gap-2">
                <span>⬆</span> Add Firmware
              </h3>
              <button
                onClick={() => !isProcessing && setShowUploadModal(false)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(['preset', 'manual'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => !isProcessing && setUploadTab(t)}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-colors border ${
                    uploadTab === t
                      ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t === 'preset' ? '🎛 Predefined Firmware' : '📁 Manual Upload'}
                </button>
              ))}
            </div>

            {uploadTab === 'preset' ? (
              <div className="grid grid-cols-5 gap-4">
                {/* Compact preset list */}
                <div className="col-span-2 space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {presets.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      disabled={isProcessing}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left ${
                        selectedPresetId === p.id
                          ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold text-xs text-slate-900 truncate">{presetLabel(p)}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {p.template === 'led' ? (
                          <span className="flex items-center gap-0.5">
                            {(['D0', 'D1', 'D2', 'D3'] as const).map(pin => (
                              <span
                                key={pin}
                                className={`w-2 h-2 rounded-full border ${
                                  p.gpio?.[pin] === 1
                                    ? 'bg-amber-400 border-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]'
                                    : 'bg-slate-200 border-slate-300'
                                }`}
                                title={`${pin} ${p.gpio?.[pin] === 1 ? 'HIGH' : 'LOW'}`}
                              />
                            ))}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">LCD</span>
                        )}
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {p.version}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {/* Code editor */}
                <div className="col-span-3 flex flex-col border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden">
                  {selectedPreset ? (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-900 truncate">{presetLabel(selectedPreset)}</p>
                          <p className="text-[10px] font-mono text-slate-500">
                            {selectedPreset.version} · ESP32 Arduino C · <a href={downloadUrl(selectedPreset.version)} download className="text-cyan-700 hover:underline">⬇ download .c</a>
                            {codeDirty && <span className="text-amber-600 font-bold"> · edited</span>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetCode}
                          disabled={!codeDirty || isProcessing}
                          className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 shrink-0"
                        >
                          ↺ Reset
                        </button>
                      </div>
                      <textarea
                        value={editedCode}
                        onChange={e => handleCodeEdited(e.target.value)}
                        disabled={isProcessing}
                        spellCheck={false}
                        className="flex-1 min-h-[280px] w-full bg-slate-900 text-emerald-100 font-mono text-[11px] leading-relaxed p-3 resize-none focus:outline-none"
                      />
                      <p className="text-[10px] font-mono text-slate-500 px-3 py-1.5 bg-white border-t border-slate-200">
                        ✎ Edit the sketch freely — the uploaded code drives the device exactly as written.
                      </p>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                      <span className="text-2xl">📄</span>
                      <p className="font-mono text-xs font-bold text-slate-700">Select a preset</p>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Pick a preset — or download its .c file, edit offline, and use Manual Upload in the demo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Manual file input */}
                <div>
                  <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Choose File (.c, .cpp, .ino, .bin)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".c,.cpp,.ino,.bin"
                    onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                    disabled={isProcessing}
                    className="w-full text-xs font-mono text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-bold file:bg-cyan-50 file:text-cyan-800 hover:file:bg-cyan-100 cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50"
                  />
                  {fileName && (
                    <div className="text-[11px] font-mono text-emerald-700 font-bold mt-1">
                      Selected: {fileName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Or paste source code</label>
                  <textarea
                    value={fileContent ?? ''}
                    onChange={e => setFileContent(e.target.value)}
                    rows={8}
                    disabled={isProcessing}
                    spellCheck={false}
                    placeholder="#include <WiFi.h> ..."
                    className="w-full bg-slate-900 text-emerald-100 border border-slate-700 rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Version & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Firmware Version</label>
                <input
                  value={newVersion}
                  onChange={e => setNewVersion(e.target.value)}
                  placeholder="v2.1.0"
                  disabled={isProcessing}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Description</label>
                <input
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Firmware changelog or release notes..."
                  disabled={isProcessing}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Validation Progress Bar */}
            {uploadPhase !== 'idle' && (
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  {uploadPhase === 'uploading' && <span className="text-cyan-800">Uploading binary chunk...</span>}
                  {uploadPhase === 'validating' && <span className="text-amber-800">Validating SHA-256 Checksum...</span>}
                  {uploadPhase === 'valid' && <span className="text-emerald-800">✅ Firmware Valid & Verified</span>}
                  {uploadPhase === 'error' && <span className="text-red-700">⚠ {uploadError}</span>}
                  <span className="text-slate-700">{uploadProgress}%</span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      uploadPhase === 'valid' ? 'bg-emerald-500' : uploadPhase === 'error' ? 'bg-red-500' : 'bg-cyan-600'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={startUploadAndValidate}
                disabled={
                  isProcessing ||
                  !newVersion ||
                  (uploadTab === 'preset' ? !selectedPreset : !(fileContent || fileInputRef.current?.files?.[0]))
                }
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Upload & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code viewer for registered firmware */}
      {viewCode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="font-mono font-bold text-slate-900 text-sm">
                {'</>'} Source — <span className="text-cyan-700">{viewCode.version}</span>
              </h3>
              <button onClick={() => setViewCode(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <pre className="flex-1 overflow-auto bg-slate-900 text-emerald-100 font-mono text-[11px] leading-relaxed p-4 m-0">
              {viewCode.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

/** Preset card with a live mini hardware preview (LEDs / LCD). */
function PresetCard({ preset, selected, onSelect }: {
  preset: PresetFw
  selected: boolean
  onSelect: () => void
}) {
  const previewRows = preset.lcd ?? (preset.dynamic ? LCD_PREVIEW_ROWS[preset.dynamic] : null)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={false}
      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
        selected
          ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-200 shadow-2xs'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-bold text-xs text-slate-900 truncate">{preset.name}</p>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight line-clamp-2">{preset.desc}</p>
        </div>
        <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
          {preset.version}
        </span>
      </div>

      {/* Mini hardware preview */}
      <div className="mt-2 flex items-center justify-center min-h-[54px]">
        {preset.template === 'led' ? (
          <div className="flex items-center gap-2">
            {(['D0', 'D1', 'D2', 'D3'] as const).map(pin => (
              <LedIndicator
                key={pin}
                label={pin}
                size="sm"
                on={preset.gpio?.[pin] === 1}
              />
            ))}
          </div>
        ) : previewRows ? (
          <LcdScreen row1={previewRows.row1} row2={previewRows.row2} size="sm" />
        ) : (
          <LcdScreen row1="" row2="" size="sm" />
        )}
      </div>
    </button>
  )
}
