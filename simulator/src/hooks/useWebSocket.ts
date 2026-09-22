import { useEffect, useRef, useState, useCallback } from 'react'
import type { WSEvent } from '@shared/types'

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const WS_URL = API.replace(/^http/, 'ws') + '/ws/events'

export function useWebSocket(onEvent?: (e: WSEvent) => void) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let ws: WebSocket
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        retryTimeout = setTimeout(connect, 3000)
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
    return () => {
      clearTimeout(retryTimeout)
      ws?.close()
    }
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
}

export function useApi<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get(path)
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { refetch() }, [refetch, ...deps])

  return { data, loading, refetch }
}
