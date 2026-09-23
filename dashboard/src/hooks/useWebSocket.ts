import { useEffect, useRef, useState, useCallback } from 'react'
import type { WSEvent } from '@shared/types'
const envBase = import.meta.env.VITE_API_BASE
const isLocalhost = envBase && (envBase.includes('localhost') || envBase.includes('127.0.0.1'))
const API = (import.meta.env.PROD && isLocalhost)
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (envBase || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'))
const WS_URL = (API.startsWith('https://') ? API.replace(/^https/, 'wss') : API.replace(/^http/, 'ws')) + '/ws/events'

export function useWebSocket(onEvent?: (e: WSEvent) => void) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let ws: WebSocket
    let retryTimeout: ReturnType<typeof setTimeout>
    let disposed = false
    function connect() {
      if (disposed) return
      ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        // Without the disposed guard, unmount → close → onclose → reconnect
        // leaks a forever-reconnecting socket on every modal open/close,
        // duplicating every WS-delivered log line.
        if (!disposed) retryTimeout = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WSEvent
          if (event.type !== 'ping') onEventRef.current?.(event)
        } catch {}
      }
    }
    connect()
    return () => { disposed = true; clearTimeout(retryTimeout); ws?.close() }
  }, [])

  return { connected }
}

export const api = {
  base: API,
  async get(path: string) {
    const r = await fetch(`${API}${path}`)
    return r.json()
  },
  async post(path: string, body: unknown) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return r.json()
  },
  async delete(path: string) {
    const r = await fetch(`${API}${path}`, { method: 'DELETE' })
    return r.json()
  },
  async put(path: string, body: unknown) {
    const r = await fetch(`${API}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return r.json()
  },
  async patch(path: string, body: unknown) {
    const r = await fetch(`${API}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return r.json()
  },
  async upload(path: string, formData: FormData) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      body: formData,
    })
    return r.json()
  },
}


export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { const d = await api.get(path); setData(d) }
    finally { setLoading(false) }
  }, [path])
  useEffect(() => { refetch() }, [refetch])
  return { data, loading, refetch }
}
