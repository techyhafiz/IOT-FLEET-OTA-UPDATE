# IoT OTA Fleet Management Dashboard

A two-PC local-network IoT OTA update and fleet management demo system.

- **PC-A** → runs the backend + dashboard (mission control)
- **PC-B** → runs the simulator (ESP32 device farm)

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Both PCs on the same Wi-Fi network

---

## Installation

### 1. Backend (PC-A)
```powershell
cd backend
pip install -r requirements.txt
```

### 2. Dashboard (PC-A)
```powershell
cd dashboard
npm install
copy .env.example .env
```

### 3. Simulator (PC-B)
```powershell
cd simulator
npm install
copy .env.example .env
# Edit .env — set VITE_API_BASE to PC-A's LAN IP:
# VITE_API_BASE=http://192.168.x.x:8000
```

---

## Running

Open **three terminals** on PC-A:

```powershell
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Dashboard (PC-A browser)
cd dashboard
npm run dev

# Terminal 3 — Simulator (open in PC-B browser at http://PC-A-IP:3000)
cd simulator
npm run dev --host
```

**PC-B:** Open browser → `http://192.168.x.x:3000`
**PC-A:** Open browser → `http://localhost:5173`

> **Note on Ports:** If port 8000 is already occupied by another service on your machine, you can run uvicorn on any available port (e.g. `--port 8765`) and update `VITE_API_BASE=http://<PC-A-IP>:8765` in `dashboard/.env` and `simulator/.env`.

---

## Demo Script (7 Beats)

1. **Fleet view** — 5 ESP32 devices on PC-B, all online, all on v1.0.0
2. **Click a device** — show board, GPIO states, live logs
3. **Single OTA** — push v1.1.0 to one device, watch progress bar fill
4. **Batch OTA** — select 4 devices, push v1.1.0, watch 4 bars simultaneously
5. **Rollback** — reset one device to v1.0.0, version history shown
6. **Config push** — push JSON config, device logs show it received
7. **Kill/revive** — delete a device on PC-B, it goes offline on PC-A live

---

## Project Structure

```
IOT/
├── backend/          # FastAPI (Python) — port 8000
│   ├── main.py
│   ├── requirements.txt
│   └── firmware/     # Placeholder .bin files
├── dashboard/        # PC-A React app — port 5173
├── simulator/        # PC-B React app — port 3000
├── shared/
│   ├── types.ts      # Shared TypeScript interfaces
│   └── components/   # Shared SVG components (ESP32 board, LED, LCD)
├── prd.json          # Ralph task backlog
├── progress.txt      # Ralph iteration log
└── AGENTS.md         # Codebase conventions
```
