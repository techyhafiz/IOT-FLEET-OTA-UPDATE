import { useEffect, useRef, useState, useCallback } from 'react'
import type { WSEvent } from '@shared/types'
const envBase = import.meta.env.VITE_API_BASE
const isLocalhost = envBase && (envBase.includes('localhost') || envBase.includes('127.0.0.1'))
const API = (import.meta.env.PROD && isLocalhost)
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (envBase || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'))
const WS_URL = (API.startsWith('https://') ? API.replace(/^https/, 'wss') : API.replace(/^http/, 'ws')) + '/ws/events'

/**
 * When the simulator runs on a different machine (PC-B) than the backend,
 * VITE_API_BASE may point at localhost — which only works on the backend host.
 * The backend announces its own host over the WebSocket handshake; `api` then
 * prefers that host so remote devices hit the right server.
 */
let globalServerHost: string | null = null

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
        if (!disposed) retryTimeout = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          // Parsed loosely first — the wire protocol may include handshake
          // frames ('hello') that aren't in the typed WSEvent union.
          const raw = JSON.parse(e.data) as { type: string; device_id: string; payload: unknown }
          // Backend handshake tells us the host the backend itself is bound to
          if (raw.type === 'hello') {
            const host = (raw.payload as { server_host?: string })?.server_host
            if (host && host !== globalServerHost) {
              globalServerHost = host
            }
            return
          }
          if (raw.type !== 'ping') onEventRef.current?.(raw as WSEvent)
        } catch {}
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(retryTimeout)
      ws?.close()
    }
  }, [])

  return { connected }
}

export const api = {
  base: API,
  get serverBase() {
    if (globalServerHost && !import.meta.env.PROD) {
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
      return `${protocol}//${globalServerHost}`
    }
    return API
  },
  async get(path: string) {
    const r = await fetch(`${api.serverBase}${path}`)
    if (!r.ok) throw new Error(`${r.status} ${path}`)
    return r.json()
  },
  async post(path: string, body: unknown) {
    const r = await fetch(`${api.serverBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`${r.status} ${path}`)
    return r.json()
  },
  async delete(path: string) {
    const r = await fetch(`${api.serverBase}${path}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`${r.status} ${path}`)
    return r.json()
  },
  async put(path: string, body: unknown) {
    const r = await fetch(`${api.serverBase}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`${r.status} ${path}`)
    return r.json()
  },
}

/** Fetch on mount + re-fetch on an interval. Cheap and device-driven. */
export function useApiPoll<T>(path: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const pathRef = useRef(path)
  pathRef.current = path

  const refetch = useCallback(async () => {
    const p = pathRef.current
    if (!p) return
    try {
      const d = await api.get(p)
      setData(d)
    } catch {}
  }, [])

  useEffect(() => {
    refetch()
    if (!intervalMs || !path) return
    const t = setInterval(refetch, intervalMs)
    return () => clearInterval(t)
  }, [path, intervalMs, refetch])

  return { data, refetch }
}
