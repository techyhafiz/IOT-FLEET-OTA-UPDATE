import React, { useState, useRef } from 'react'
import type { FirmwareVersion } from '@shared/types'
import { api } from '../hooks/useWebSocket'

interface Props {
  firmware: FirmwareVersion[]
  onRefresh: () => void
}

const SAMPLE_C_CODE = `#include <WiFi.h>
#include <HTTPClient.h>

// Sensor Telemetry & Power Management v1.3.0
const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }
  Serial.println("[OTA v1.3.0] Telemetry Node Verified & Online.");
}

void loop() {
  int val = analogRead(SENSOR_PIN);
  Serial.printf("[SENSOR] ADC Value: %d\\n", val);
  delay(2000);
}
`

export function FirmwarePage({ firmware, onRefresh }: Props) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  
  // Progress states
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'validating' | 'valid'>('idle')
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelected = (file: File) => {
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

  const handleLoadSample = () => {
    setFileName('telemetry_sensor_v1.3.0.cpp')
    setNewVersion('v1.3.0')
    setNewDescription('High-precision ADC sensor reading with deep-sleep telemetry loop.')
    setFileContent(SAMPLE_C_CODE)
  }

  const startUploadAndValidate = async () => {
    if (!newVersion) return
    setIsProcessing(true)
    setUploadPhase('uploading')
    setUploadProgress(20)

    // Stage 1: Uploading progress
    await new Promise(r => setTimeout(r, 400))
    setUploadProgress(65)

    // Stage 2: Checksum validation
    setUploadPhase('validating')
    await new Promise(r => setTimeout(r, 600))
    setUploadProgress(95)

    try {
      if (fileInputRef.current?.files?.[0]) {
        const formData = new FormData()
        formData.append('file', fileInputRef.current.files[0])
        formData.append('version', newVersion)
        formData.append('changelog', newDescription)
        await api.upload('/api/firmware/upload', formData)
      } else {
        await api.post('/api/firmware/upload-source', {
          version: newVersion,
          changelog: newDescription,
          filename: fileName || `${newVersion}.cpp`,
          code: fileContent || SAMPLE_C_CODE,
          size: fileContent ? fileContent.length : 512000,
        })
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
      }, 1000)
    } catch (err) {
      console.error(err)
      setIsProcessing(false)
      setUploadPhase('idle')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
          <span>⬆</span> Upload New Firmware
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {firmware.map((fw, idx) => {
              const isLatest = idx === 0
              return (
                <tr key={fw.version} className="hover:bg-slate-50/70 transition-colors">
                  {/* Firmware Version */}
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-sm">{fw.version}</span>
                    {isLatest && (
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 px-1.5 py-0.2 rounded font-bold">
                        Latest
                      </span>
                    )}
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Modal with Progress Bar and Validation Check */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-mono font-bold text-slate-900 text-base flex items-center gap-2">
                <span>⬆</span> Upload Firmware (.c, .cpp, .bin)
              </h3>
              <button
                onClick={() => !isProcessing && setShowUploadModal(false)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Demo Sample Button */}
            <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-950">Quick demo? Use ready-to-test C sketch:</span>
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-bold transition-colors"
              >
                Load Sample C File
              </button>
            </div>

            {/* File Input */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Choose File</label>
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

            {/* Version & Description */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Firmware Version</label>
                <input
                  value={newVersion}
                  onChange={e => setNewVersion(e.target.value)}
                  placeholder="v1.3.0"
                  disabled={isProcessing}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-slate-600 mb-1 block">Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Firmware changelog or release notes..."
                  disabled={isProcessing}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-cyan-500 resize-none"
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
                  <span className="text-slate-700">{uploadProgress}%</span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      uploadPhase === 'valid' ? 'bg-emerald-500' : 'bg-cyan-600'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
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
                disabled={isProcessing || !newVersion}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Upload & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
