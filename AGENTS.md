# AGENTS.md — IoT OTA Dashboard
# Conventions and patterns for autonomous agent implementation

## Project Structure
```
IOT/
├── backend/          # FastAPI server (Python) — port 8000
├── dashboard/        # PC-A React app (Vite + Tailwind) — port 5173
├── simulator/        # PC-B React app (Vite + Tailwind) — port 3000
├── shared/
│   ├── types.ts      # Shared TypeScript interfaces
│   └── components/   # Shared SVG React components (Esp32Board, LedIndicator, LcdScreen)
├── prd.json          # Ralph task backlog
├── progress.txt      # Ralph iteration log
└── AGENTS.md         # This file
```

## Key Rules
1. **Never hardcode IP addresses.** Use `VITE_API_BASE` env var in both frontends.
2. **Never show pin states on home/grid cards.** Only in detail views.
3. **SVG components are shared.** Never duplicate Esp32Board, LedIndicator, or LcdScreen between apps.
4. **Backend is stateless across restarts.** In-memory only — no SQLite, no files for state.
5. **All real-time updates go through WebSocket.** Don't poll `/api/devices` for live state.
6. **Template is permanent per device.** Once created as LED or LCD, it doesn't change.

## Device State Shape (Python dict / TypeScript interface)
```typescript
interface Device {
  id: string;           // e.g. "ESP-A1F3"
  mac: string;          // e.g. "A1:F3:00:11:22:33"
  firmware: string;     // e.g. "v1.1.0"
  group: string;        // e.g. "floor-1"
  template: 'led' | 'lcd';
  online: boolean;
  uptime: number;       // seconds
  gpio: { D0: 0|1, D1: 0|1, D2: 0|1, D3: 0|1 };
  lcd?: { row1: string, row2: string };
  ota_pending?: string; // version string if update pending
  ota_progress?: number;// 0-100
  config?: Record<string, unknown>;
  logs: LogEntry[];
  registered_at: string;
}
```

## WebSocket Event Shape
```typescript
interface WSEvent {
  type: 'device_registered' | 'device_removed' | 'device_status' |
        'device_log' | 'ota_started' | 'ota_progress' | 'ota_complete' |
        'config_pushed';
  device_id: string;
  payload: unknown; // event-specific data
}
```

## OTA Flow (Simulator Side)
1. Simulator polls `GET /ota/update/{id}` every 5s
2. If 200 returned: start fake download — send ota_progress 10,20,...,100 every 500ms
3. At 100%: POST /api/devices/{id}/status with `{ state: 'complete', firmware: newVersion }`
4. Backend clears ota_pending, broadcasts ota_complete

## Tailwind Dark Theme Classes (use these consistently)
- Page bg: `bg-[#0f172a]`
- Card bg: `bg-slate-800` / `bg-[#1e293b]`
- Card border: `border border-slate-700`
- Primary accent: `text-cyan-400` / `bg-cyan-500`
- Success: `text-green-400`
- Warning: `text-amber-400`
- Error: `text-red-400`
- Muted text: `text-slate-400`
