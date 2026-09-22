import React, { useState } from 'react'
import type { Device, FirmwareVersion } from '@shared/types'

interface Props {
  devices: Device[]
  firmware: FirmwareVersion[]
}

export function AnalyticsPage({ devices, firmware }: Props) {
  const [timeRange, setTimeRange] = useState('Last 7 Days')

  const totalDevices = devices.length || 3
  const onlineCount = devices.filter(d => d.online).length || 3

  const recentDeployments = [
    {
      id: 'DEP-005',
      version: 'v1.3.0',
      targetDevices: 3,
      successful: 3,
      failed: 0,
      status: 'Completed',
      startedAt: 'Sep 22, 10:26 PM',
      duration: '2m 14s',
    },
    {
      id: 'DEP-004',
      version: 'v1.2.0',
      targetDevices: 3,
      successful: 3,
      failed: 0,
      status: 'Completed',
      startedAt: 'Sep 20, 08:14 PM',
      duration: '1m 52s',
    },
    {
      id: 'DEP-003',
      version: 'v1.1.0',
      targetDevices: 3,
      successful: 3,
      failed: 0,
      status: 'Completed',
      startedAt: 'Sep 18, 06:40 PM',
      duration: '2m 03s',
    },
    {
      id: 'DEP-002',
      version: 'v1.0.0',
      targetDevices: 3,
      successful: 3,
      failed: 0,
      status: 'Completed',
      startedAt: 'Sep 16, 11:12 AM',
      duration: '1m 48s',
    },
    {
      id: 'DEP-001',
      version: 'v1.0.0',
      targetDevices: 3,
      successful: 3,
      failed: 0,
      status: 'Completed',
      startedAt: 'Sep 15, 09:02 PM',
      duration: '2m 11s',
    },
  ]

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full">
      {/* ─── PAGE HEADER & GLOBAL TIMEFRAME FILTER ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs">
            <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight leading-tight">Analytics</h2>
            <p className="text-[10px] text-slate-500 font-sans leading-none">OTA deployment insights and fleet updates</p>
          </div>
        </div>

        {/* Global Date Range Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="appearance-none bg-white border border-slate-200/90 rounded-xl pl-7 pr-7 py-1 text-xs text-slate-700 font-semibold shadow-2xs focus:outline-none cursor-pointer hover:bg-slate-50"
            >
              <option>Last 7 Days</option>
              <option>Last 14 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
            <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400 text-xs">
              ⌵
            </span>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: 4 KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Total OTA Deployments */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-500 block leading-tight">Total OTA Deployments</span>
            <div className="text-xl font-bold text-slate-900 leading-tight">5</div>
            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 leading-tight">
              <span>↑</span>
              <span>67% from previous week</span>
            </span>
          </div>
        </div>

        {/* Card 2: Successful Deployments */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-500 block leading-tight">Successful Deployments</span>
            <div className="text-xl font-bold text-slate-900 leading-tight">5</div>
            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>100% success rate</span>
            </span>
          </div>
        </div>

        {/* Card 3: Failed Deployments */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-500 block leading-tight">Failed Deployments</span>
            <div className="text-xl font-bold text-slate-900 leading-tight">0</div>
            <span className="text-[10px] font-medium text-red-500 flex items-center gap-1 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>0% failure rate</span>
            </span>
          </div>
        </div>

        {/* Card 4: Total Devices */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-500 block leading-tight">Total Devices</span>
            <div className="text-xl font-bold text-slate-900 leading-tight">{totalDevices}</div>
            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{onlineCount} online (100%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: 3 DETAILED CHARTS ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Chart 1: OTA Deployments Over Time (Bar Chart) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-xs text-slate-900">OTA Deployments Over Time</h3>
            <select className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.2 text-[10px] text-slate-700 font-medium focus:outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 14 Days</option>
            </select>
          </div>

          {/* Sub-Legend */}
          <div className="flex items-center gap-2.5 pt-1 text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Successful
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Failed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Total
            </span>
          </div>

          {/* SVG Bar Chart with Y-Axis */}
          <div className="pt-2 h-28 relative flex items-end">
            <div className="w-full h-full pl-5 flex flex-col justify-between">
              {/* Grid Lines & Bars */}
              <div className="relative flex-1 flex items-end justify-between border-b border-slate-200 pb-0.5">
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-4">3</span>
                  </div>
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-4">2</span>
                  </div>
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-4">1</span>
                  </div>
                  <div className="w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-4">0</span>
                  </div>
                </div>

                {/* Day Bars: Sep 16 - Sep 22 */}
                {[
                  { day: 'Sep 16', count: 0 },
                  { day: 'Sep 17', count: 0 },
                  { day: 'Sep 18', count: 1 },
                  { day: 'Sep 19', count: 0 },
                  { day: 'Sep 20', count: 1 },
                  { day: 'Sep 21', count: 0 },
                  { day: 'Sep 22', count: 3 },
                ].map(item => (
                  <div key={item.day} className="flex-1 flex flex-col items-center justify-end h-full z-10">
                    {item.count > 0 ? (
                      <div
                        className="w-4 bg-emerald-500 rounded-t-sm transition-all duration-500 shadow-2xs hover:bg-emerald-600"
                        style={{ height: `${(item.count / 3) * 85}%` }}
                      />
                    ) : (
                      <div className="w-4 h-0.5 bg-slate-200" />
                    )}
                  </div>
                ))}
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between pt-1 text-[9px] font-sans text-slate-400">
                <span>Sep 16</span>
                <span>Sep 17</span>
                <span>Sep 18</span>
                <span>Sep 19</span>
                <span>Sep 20</span>
                <span>Sep 21</span>
                <span>Sep 22</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Firmware Version Distribution (Donut Chart) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <h3 className="font-sans font-bold text-xs text-slate-900">Firmware Version Distribution</h3>

          <div className="flex items-center justify-between gap-3 py-1">
            {/* SVG Donut Chart */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 42 42" className="w-20 h-20 transform -rotate-90">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke="#047857"
                  strokeWidth="6"
                  strokeDasharray="33.3 66.7"
                  strokeDashoffset="0"
                />
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeDasharray="33.3 66.7"
                  strokeDashoffset="-33.3"
                />
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke="#86efac"
                  strokeWidth="6"
                  strokeDasharray="33.4 66.6"
                  strokeDashoffset="-66.6"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-sans text-base font-bold text-slate-900 leading-none">3</span>
                <span className="text-[8px] font-medium text-slate-500 mt-0.5">Devices</span>
              </div>
            </div>

            {/* Legend with exact percentages */}
            <div className="flex-1 space-y-1 font-sans text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#047857]" />
                  <span className="font-mono font-bold text-slate-900 text-[11px]">v1.3.0</span>
                </span>
                <span className="text-slate-600 font-medium text-[11px]">1 (33%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="font-mono font-bold text-slate-900 text-[11px]">v1.2.0</span>
                </span>
                <span className="text-slate-600 font-medium text-[11px]">1 (33%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#86efac]" />
                  <span className="font-mono font-bold text-slate-900 text-[11px]">v1.0.0</span>
                </span>
                <span className="text-slate-600 font-medium text-[11px]">1 (33%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Deployment Success Rate (100% Stacked Columns) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-xs text-slate-900">Deployment Success Rate</h3>
            <select className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.2 text-[10px] text-slate-700 font-medium focus:outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 14 Days</option>
            </select>
          </div>

          <div className="pt-2 h-28 relative flex items-end">
            <div className="w-full h-full pl-5 flex flex-col justify-between">
              {/* Grid Lines & 100% Green Columns */}
              <div className="relative flex-1 flex items-end justify-between border-b border-slate-200 pb-0.5">
                {/* Y Axis percentage markers */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-5">100%</span>
                  </div>
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-5">75%</span>
                  </div>
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-5">50%</span>
                  </div>
                  <div className="border-b border-slate-100 w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-5">25%</span>
                  </div>
                  <div className="w-full flex justify-between">
                    <span className="text-[8px] font-mono text-slate-400 -mt-1.5 -ml-4">0%</span>
                  </div>
                </div>

                {/* 100% Green Columns */}
                {['Sep 16', 'Sep 17', 'Sep 18', 'Sep 19', 'Sep 20', 'Sep 21', 'Sep 22'].map(day => (
                  <div key={day} className="flex-1 flex flex-col items-center justify-end h-full z-10">
                    <div className="w-3.5 h-[85%] bg-emerald-500 rounded-t-xs shadow-2xs hover:bg-emerald-600 transition-colors" />
                  </div>
                ))}
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between pt-1 text-[9px] font-sans text-slate-400">
                <span>Sep 16</span>
                <span>Sep 17</span>
                <span>Sep 18</span>
                <span>Sep 19</span>
                <span>Sep 20</span>
                <span>Sep 21</span>
                <span>Sep 22</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: RECENT DEPLOYMENTS TABLE & STATUS DONUT ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Recent Deployments (8 Columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="font-sans font-bold text-xs text-slate-900">Recent Deployments</h3>
              </div>
              <button className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 hover:underline cursor-pointer flex items-center gap-1">
                <span>View All</span>
                <span>→</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-1">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                    <th className="py-1 px-2 font-normal">ID</th>
                    <th className="py-1 px-2 font-normal">Version</th>
                    <th className="py-1 px-2 font-normal">Target</th>
                    <th className="py-1 px-2 font-normal">OK</th>
                    <th className="py-1 px-2 font-normal">Fail</th>
                    <th className="py-1 px-2 font-normal">Status</th>
                    <th className="py-1 px-2 font-normal">Started At</th>
                    <th className="py-1 px-2 font-normal">Duration</th>
                    <th className="py-1 px-2 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentDeployments.slice(0, 4).map(dep => (
                    <tr key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1 px-2 font-mono font-medium text-slate-800 text-[11px]">{dep.id}</td>
                      <td className="py-1 px-2 font-mono font-bold text-slate-900 text-[11px]">{dep.version}</td>
                      <td className="py-1 px-2 text-slate-700 font-medium text-[11px]">{dep.targetDevices}</td>
                      <td className="py-1 px-2 text-slate-700 font-medium text-[11px]">{dep.successful}</td>
                      <td className="py-1 px-2 text-slate-700 font-medium text-[11px]">{dep.failed}</td>
                      <td className="py-1 px-2">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-slate-500 whitespace-nowrap text-[10px]">{dep.startedAt}</td>
                      <td className="py-1 px-2 font-mono text-slate-700 text-[10px]">{dep.duration}</td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button className="px-2 py-0.5 text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 shadow-2xs cursor-pointer">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Deployment Status Donut (4 Columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="font-sans font-bold text-xs text-slate-900">Deployment Status</h3>
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            {/* Emerald Green Donut Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 42 42" className="w-20 h-20 transform -rotate-90">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeDasharray="100 0"
                  strokeDashoffset="0"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-sans text-base font-bold text-slate-900 leading-none">5</span>
                <span className="text-[8px] font-medium text-slate-500 mt-0.5">Deployments</span>
              </div>
            </div>

            {/* Status Breakdown Legend */}
            <div className="flex-1 space-y-1 font-sans text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-[11px]">Completed</span>
                </span>
                <span className="font-semibold text-slate-900 text-[11px]">5 (100%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-medium text-[11px]">In Progress</span>
                </span>
                <span className="font-semibold text-slate-900 text-[11px]">0 (0%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium text-[11px]">Failed</span>
                </span>
                <span className="font-semibold text-slate-900 text-[11px]">0 (0%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 4: BOTTOM 3 SUMMARY METRIC CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Card 1: Device Update Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </div>
            <h3 className="font-sans font-bold text-xs text-slate-900">Device Update Status</h3>
          </div>

          <div className="space-y-1.5">
            {/* ESP-A1F3 */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[10px] text-slate-800 w-16">ESP-A1F3</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '55%' }} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 w-10 text-right">v1.3.0</span>
            </div>

            {/* ESP-B2C4 */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[10px] text-slate-800 w-16">ESP-B2C4</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 w-10 text-right">v1.2.0</span>
            </div>

            {/* ESP-C9D1 */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[10px] text-slate-800 w-16">ESP-C9D1</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-300 h-full rounded-full" style={{ width: '45%' }} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 w-10 text-right">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Card 2: Deployment Duration */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="font-sans font-bold text-xs text-slate-900">Deployment Duration</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Box 1: Average */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-900 font-mono">1m 56s</span>
              <span className="text-[9px] text-slate-500 leading-tight">Average</span>
            </div>

            {/* Box 2: Longest */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-900 font-mono">2m 14s</span>
              <span className="text-[9px] text-slate-500 leading-tight">Longest</span>
            </div>

            {/* Box 3: Shortest */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-900 font-mono">1m 48s</span>
              <span className="text-[9px] text-slate-500 leading-tight">Shortest</span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Firmware Versions */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-sans font-bold text-xs text-slate-900">Top Firmware Versions</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                  <th className="pb-1 font-normal">Version</th>
                  <th className="pb-1 font-normal">Devices</th>
                  <th className="pb-1 font-normal text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-1 font-mono font-bold text-slate-900 text-[11px]">v1.3.0</td>
                  <td className="py-1 text-slate-700 text-[11px]">1</td>
                  <td className="py-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-medium text-slate-600 text-[10px]">33%</span>
                      <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: '33%' }} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-mono font-bold text-slate-900 text-[11px]">v1.2.0</td>
                  <td className="py-1 text-slate-700 text-[11px]">1</td>
                  <td className="py-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-medium text-slate-600 text-[10px]">33%</span>
                      <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '33%' }} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-mono font-bold text-slate-900 text-[11px]">v1.0.0</td>
                  <td className="py-1 text-slate-700 text-[11px]">1</td>
                  <td className="py-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-medium text-slate-600 text-[10px]">33%</span>
                      <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-300 h-full rounded-full" style={{ width: '33%' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
