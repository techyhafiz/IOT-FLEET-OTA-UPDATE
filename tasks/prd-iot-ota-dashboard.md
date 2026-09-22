# PRD: IoT OTA Fleet Management Dashboard

## 1. Introduction / Overview

A two-PC, local-network IoT OTA (Over-The-Air) update and fleet management demo system built for a university presentation.

**PC-A** runs a FastAPI backend + React web dashboard (browser-based, dark IoT aesthetic). It is the mission control — fleet grid, OTA pushes, firmware management, grouping, live logs.

**PC-B** runs a React web simulator UI (separate port) that visually represents simulated ESP32 devices. Each device is a graphic card showing an animated PCB board. Clicking a device opens a full detail view with pin states, LEDs as glowing SVG graphics, 16×2 LCD preview, presets, firmware controls, and real C++ Arduino sketch code. Adding or deleting a device on PC-B automatically syncs to PC-A's fleet in real time.

The goal is to demonstrate a credible, visually impressive IoT OTA system — indistinguishable from real hardware to a non-technical professor — while being 100% software-simulated.

---

## 2. Goals

- Visually represent ESP32 devices as graphic PCB cards — anyone can understand at a glance
- Demonstrate live OTA firmware updates (individual + batch) with animated progress
- Show device firmware rollback and reset
- Support two hardware templates: **2-LED Controller** and **16×2 LCD Display**
- Show template-specific presets: LED on/off combos, LCD text presets
- Display real C++ Arduino OTA sketch code per device
- Sync device add/delete between PC-B simulator and PC-A dashboard automatically
- Support device grouping (floor-1, floor-2, rooftop) managed from PC-A
- Stream real-time logs per device in a terminal-style panel
- Work entirely over local Wi-Fi with no internet or cloud dependency

---

## 3. User Stories

---

### US-001: Project Scaffold & Monorepo Setup
**Description:** As a developer, I want a clean monorepo project structure so that PC-A (dashboard) and PC-B (simulator) share types and can be run independently.

**Acceptance Criteria:**
- [ ] Root folder `iot-ota-dashboard/` with subdirs: `backend/`, `dashboard/`, `simulator/`, `shared/`
- [ ] `backend/` — FastAPI app (`uvicorn main:app --reload`)
- [ ] `dashboard/` — React + Vite + TailwindCSS app (port 5173)
- [ ] `simulator/` — React + Vite + TailwindCSS app (port 3000)
- [ ] `shared/` — shared TypeScript types (`Device`, `FirmwareVersion`, `OTAStatus`, etc.)
- [ ] Root `README.md` with setup instructions for both PCs
- [ ] Both frontend apps start with `npm run dev` without errors
- [ ] Backend starts with `uvicorn main:app --reload` without errors

---

### US-002: Backend — Device Registry & WebSocket Event Bus
**Description:** As the system, I want a FastAPI backend that maintains device state and broadcasts real-time events so that both UIs stay in sync.

**Acceptance Criteria:**
- [ ] `POST /api/devices/register` — register a device `{ id, mac, firmware, group, template }`
- [ ] `DELETE /api/devices/{id}` — remove a device
- [ ] `GET /api/devices` — return all registered devices with full state
- [ ] `POST /api/devices/{id}/status` — update device state (gpio, uptime, logs, ota_progress)
- [ ] `POST /api/devices/{id}/logs` — append a log line
- [ ] `GET /api/devices/{id}/logs` — return last 100 log lines
- [ ] `WebSocket /ws/events` — broadcast events to all connected clients on any state change
- [ ] Event types: `device_registered`, `device_removed`, `device_status`, `device_log`, `ota_started`, `ota_progress`, `ota_complete`
- [ ] In-memory state (no database needed) — `dict` keyed by device ID
- [ ] CORS enabled for `localhost:5173` and `localhost:3000`

---

### US-003: Backend — Firmware Store & OTA Endpoints
**Description:** As the system, I want the backend to serve firmware files and manage OTA update state so that simulator devices can poll and download updates.

**Acceptance Criteria:**
- [ ] `firmware/` directory with placeholder `.bin` files: `v1.0.0.bin`, `v1.1.0.bin`, `v1.2.0.bin`
- [ ] `GET /api/firmware` — return list of available firmware versions with metadata (version, size, changelog)
- [ ] `POST /api/ota/push` — trigger OTA for one or more device IDs `{ device_ids: [], version: "v1.2.0" }`
- [ ] `POST /api/ota/rollback` — rollback device to a specific version `{ device_id, version }`
- [ ] `GET /ota/update/{device_id}` — ESP32-compatible endpoint: returns `200 + binary` if update pending, `304 Not Modified` if up to date
- [ ] Backend marks device as `ota_pending` when pushed; clears after simulator confirms completion
- [ ] `POST /api/ota/reset` — reset device firmware to a chosen version (triggers re-flash flow)

---

### US-004: Backend — Group & Config Management
**Description:** As a developer, I want group management and config push endpoints so that PC-A can organize and configure devices.

**Acceptance Criteria:**
- [ ] `GET /api/groups` — return all groups with device counts
- [ ] `POST /api/groups` — create a group `{ name }`
- [ ] `PUT /api/devices/{id}/group` — assign device to group
- [ ] `POST /api/config/push` — push JSON config to one or more devices `{ device_ids: [], config: {} }`
- [ ] Config push broadcasts `config_pushed` WebSocket event to targeted simulators
- [ ] Config payload stored on device state and visible in device detail

---

### US-005: PC-B Simulator — Home Grid (Device Cards)
**Description:** As a demo presenter, I want PC-B to show a graphic grid of ESP32 device cards so that anyone can see simulated devices at a glance.

**Acceptance Criteria:**
- [ ] Grid of device cards, responsive (3 columns on wide screen)
- [ ] Each card shows: animated SVG ESP32 PCB board, device ID, group, template type icon (💡 or 🖥), firmware version, uptime, online/offline status badge
- [ ] **No pin states or sensor data on the home card** — only shown when device is opened
- [ ] Offline device card: PCB dims/greyscales, "POWERED OFF" overlay, "Last seen: Xm ago"
- [ ] During OTA: card shows `UPDATING...` overlay on PCB with animated flicker + progress bar filling
- [ ] `[+ Add Device]` card at end of grid (always last)
- [ ] `[✕]` button on each card — deletes device from PC-B and syncs removal to PC-A via `DELETE /api/devices/{id}`
- [ ] `[👁 Open Device]` button opens device detail view
- [ ] Verify in browser: cards render, offline card dims, OTA overlay appears

---

### US-006: PC-B Simulator — Add Device Modal (Template Picker)
**Description:** As a user, I want to add a new simulated device by choosing a template so that the device spawns with the right behavior and syncs to PC-A.

**Acceptance Criteria:**
- [ ] Modal opens on `[+ Add Device]` click
- [ ] Auto-generated device ID shown (editable)
- [ ] Group dropdown (populated from `GET /api/groups`)
- [ ] Firmware version dropdown (`v1.0.0`, `v1.1.0`, `v1.2.0`)
- [ ] **Template picker with two visual options:**
  - `💡 2-LED Controller` — D0 → LED 1, D1 → LED 2, with presets
  - `🖥 16×2 LCD Display` — I2C LCD simulation, with text presets
- [ ] On confirm: `POST /api/devices/register` fires, device appears on PC-B grid AND on PC-A fleet grid simultaneously (via WebSocket)
- [ ] Cancel dismisses modal without side effects
- [ ] Verify in browser: new device card appears on both UIs after add

---

### US-007: PC-B Simulator — Device Detail View (2-LED Template)
**Description:** As a demo presenter, I want the LED device detail view to show a graphic ESP32 board with glowing LED SVGs and pin state so the professor understands it visually.

**Acceptance Criteria:**
- [ ] Full-page detail view with back button
- [ ] Left panel: SVG ESP32 board with labeled pin rows (3V3, GND, D0–D5, TX, RX), D0 and D1 wired to LED symbols
- [ ] Right panel: Two LED SVG components
  - LED ON: glowing yellow/amber circle with drop-shadow pulse animation
  - LED OFF: dark grey circle, no glow
  - Labels: "LED 1" / "LED 2", "ON" / "OFF" text below each
- [ ] Pin state updates in real time as presets are applied
- [ ] **Presets panel** (3 preset cards):
  - Preset 1: LED1 ON 🟡, LED2 OFF ⚫ — `[▶ Apply Now]`
  - Preset 2: LED1 OFF ⚫, LED2 ON 🟡 — `[▶ Apply Now]`
  - Preset 3: Both ON 🟡🟡 — `[▶ Apply Now]`
  - Applying a preset POSTs new GPIO state to backend, updates LED SVGs instantly
- [ ] OTA firmware section (current version, available version, `[⬆ Update]`, `[↺ Reset Firmware]`)
- [ ] Live logs panel: terminal-style, auto-scrolling, last 100 lines
- [ ] `[👁 View C++ Code]` button opens code viewer modal
- [ ] Verify in browser: LED glows animate, presets change LED state visually

---

### US-008: PC-B Simulator — Device Detail View (16×2 LCD Template)
**Description:** As a demo presenter, I want the LCD device detail view to show a realistic 16×2 LCD screen preview with switchable text presets.

**Acceptance Criteria:**
- [ ] Left panel: SVG ESP32 board with SDA/SCL pins wired to LCD symbol
- [ ] Right panel: 16×2 LCD SVG component
  - Dark green background, amber/green monospace character cells
  - Two rows of 16 characters each
  - Backlight glow effect (ambient green/amber)
  - Text updates instantly when preset is applied
- [ ] **Presets panel** (3 preset cards), each showing a mini LCD preview:
  - Preset 1: Row1 "Hello World!", Row2 "Sys: RUNNING"
  - Preset 2: Row1 "OTA System", Row2 "v1.2.0 Ready"
  - Preset 3: Row1 "Device:", Row2 device ID
  - `[▶ Apply Now]` per preset — sends text to backend, LCD updates live
- [ ] OTA firmware section (same as LED template)
- [ ] Live logs panel
- [ ] `[👁 View C++ Code]` button
- [ ] Verify in browser: LCD text updates when preset applied, glow renders correctly

---

### US-009: PC-B Simulator — C++ Code Viewer Modal
**Description:** As a demo presenter, I want to show real C++ Arduino sketch code per device so that technical judges see a credible firmware implementation.

**Acceptance Criteria:**
- [ ] Modal opens on `[👁 View C++ Code]` click
- [ ] Syntax-highlighted C++ code (use `react-syntax-highlighter` or similar)
- [ ] Code includes: `#include <WiFi.h>`, `#include <HTTPUpdate.h>`, `setup()`, `loop()`, `checkOTA()`
- [ ] Code references the actual device ID in the OTA URL string
- [ ] Code comments reference GPIO behavior: `// D0 HIGH → LED 1 ON`
- [ ] Footer note: "This is the exact code this device would run on real ESP32 hardware"
- [ ] Read-only — no editing
- [ ] Two distinct sketches: LED template sketch and LCD template sketch (with `#include <LiquidCrystal_I2C.h>`)
- [ ] Verify in browser: modal opens, code is syntax-highlighted, scrollable

---

### US-010: PC-B Simulator — OTA Reset / Rollback Modal
**Description:** As a user, I want a reset/rollback modal so I can demonstrate downgrading a device firmware version.

**Acceptance Criteria:**
- [ ] Modal opens on `[↺ Reset / Rollback Firmware]` click
- [ ] Shows current firmware version
- [ ] Radio list of all available versions (v1.0.0, v1.1.0, v1.2.0)
- [ ] Current version pre-selected, others selectable
- [ ] Warning text: "Device will reboot after reset"
- [ ] `[↺ Confirm Reset]` triggers `POST /api/ota/rollback`, closes modal
- [ ] Device card shows OTA flicker animation during rollback
- [ ] After rollback: device re-registers with new version, PC-A updates fleet card
- [ ] `[Cancel]` dismisses without action
- [ ] Verify in browser: rollback fires, version updates on both UIs

---

### US-011: PC-A Dashboard — Fleet Grid View
**Description:** As a demo presenter, I want the PC-A dashboard fleet grid to show all registered devices as graphic cards so the professor sees the whole fleet at a glance.

**Acceptance Criteria:**
- [ ] Dark slate background (`#0f172a`), cyan/green accent colors
- [ ] Top nav: app name, firmware badge, online/offline counts, timestamp
- [ ] Sidebar: group list with counts, firmware version list, search bar
- [ ] Fleet grid: one card per device, 3-column layout
- [ ] Each card: ESP32 SVG board (same component as PC-B), device ID, template icon, group, firmware version, uptime, online/offline badge
- [ ] No pin states shown on home card (same rule as PC-B)
- [ ] Offline device card: dimmed, "Last seen" timestamp, `[↺ Reconnect]` button (triggers PC-B to wake thread)
- [ ] Checkbox on each card for batch selection
- [ ] `[Select All]` toggle in header
- [ ] Clicking a card opens device detail panel (slide-in from right)
- [ ] Devices added/removed on PC-B appear/disappear in real time (WebSocket)
- [ ] Verify in browser: fleet renders, real-time sync works, offline state shown

---

### US-012: PC-A Dashboard — Device Detail Panel
**Description:** As a demo presenter, I want a slide-in device detail panel on PC-A so I can inspect any device without leaving the fleet view.

**Acceptance Criteria:**
- [ ] Slides in from the right side on card click, fleet grid pushes left
- [ ] Header: device ID, status badge, group, MAC address
- [ ] ESP32 SVG board (same component) + pin state visualization
- [ ] For LED devices: LED SVGs matching current pin state
- [ ] For LCD devices: LCD SVG with current text
- [ ] Firmware section: current version, version history list with `[Rollback]` buttons
- [ ] `[⬆ Update]` button — triggers OTA for this device
- [ ] Live log stream: terminal-style, auto-scrolling
- [ ] Close button (`✕`) collapses panel
- [ ] Verify in browser: panel opens/closes, pin states match PC-B in real time

---

### US-013: PC-A Dashboard — Individual OTA Push with Progress
**Description:** As a demo presenter, I want to push a firmware update to a single device and watch it progress live so the OTA flow is visually compelling.

**Acceptance Criteria:**
- [ ] `[⬆ Update to vX.X.X]` button visible when a newer version is available
- [ ] Clicking triggers `POST /api/ota/push` with single device ID
- [ ] Device card immediately shows OTA overlay: "FLASHING v1.1.0 → v1.2.0"
- [ ] Progress bar fills with live percentage (received via WebSocket `ota_progress` events)
- [ ] After 100%: device shows `✅ v1.2.0`, uptime resets, logs show reboot
- [ ] On PC-B: corresponding device card shows flicker animation + progress bar simultaneously
- [ ] Verify in browser: progress bar animates, version updates on both UIs after completion

---

### US-014: PC-A Dashboard — Batch OTA Update
**Description:** As a demo presenter, I want to select multiple devices and push a firmware update to all of them simultaneously so I can demonstrate fleet management.

**Acceptance Criteria:**
- [ ] Checkboxes on fleet cards for multi-select
- [ ] `[⬆ Push Update ▼]` button in top nav activates when ≥2 devices selected
- [ ] Batch update modal opens: firmware version dropdown, list of selected devices, `[All at once]` strategy
- [ ] `[Push]` triggers `POST /api/ota/push` with all selected device IDs
- [ ] Modal shows individual progress bar per device (name + bar + percentage + status icon)
- [ ] Overall progress bar at bottom
- [ ] Each device updates independently; bars fill at slightly different rates (realistic stagger)
- [ ] Completed devices show ✅; failed/offline show ❌
- [ ] Verify in browser: 3+ progress bars animate simultaneously, all devices update

---

### US-015: PC-A Dashboard — Firmware Management Page
**Description:** As a user, I want a firmware management page so I can see all available versions and their changelogs.

**Acceptance Criteria:**
- [ ] `[Firmware]` tab in top nav
- [ ] List of firmware versions: version number, file size, changelog, date, `[Set as Default]` button
- [ ] `[+ Upload Firmware]` button — opens modal to enter version number + changelog (no real file needed; creates placeholder `.bin`)
- [ ] Each version shows how many devices are currently on it
- [ ] Verify in browser: version list renders with counts, upload modal works

---

### US-016: PC-A Dashboard — Real-Time Log Viewer
**Description:** As a user, I want a dedicated logs page that shows live log output from all devices so I can demonstrate real-time telemetry.

**Acceptance Criteria:**
- [ ] `[Logs]` tab in top nav
- [ ] Log stream: `[timestamp]  [DEVICE_ID]  [LEVEL]  message`
- [ ] Color coding: INFO = white, WARN = amber, ERROR = red
- [ ] Filter by device ID (dropdown)
- [ ] Filter by log level
- [ ] Auto-scroll toggle (on by default)
- [ ] `[Clear]` button
- [ ] Logs stream via WebSocket in real time
- [ ] Verify in browser: logs appear as devices send them, filters work

---

### US-017: PC-A Dashboard — Group Management & Config Push
**Description:** As a user, I want to organize devices into groups and push JSON config to a group so I can demonstrate fleet configuration management.

**Acceptance Criteria:**
- [ ] Sidebar group list is clickable — filters fleet grid to that group only
- [ ] `[+ New Group]` button in sidebar — modal to enter group name
- [ ] Dragging or right-clicking a device card → `[Move to Group]` submenu
- [ ] `[Config]` tab in top nav
- [ ] Config push form: select target (all / group / individual devices), JSON editor textarea, `[Push Config]` button
- [ ] After push: targeted devices log `[INFO] Config received: {json}`
- [ ] Verify in browser: group filter works, config push triggers log entries on devices

---

### US-018: PC-B Simulator — Background Simulation Engine
**Description:** As the system, I want each simulated device to independently send heartbeats, log lines, and GPIO updates to the backend so the dashboard feels alive without manual interaction.

**Acceptance Criteria:**
- [ ] Each device runs a simulation loop (setInterval) every 2 seconds
- [ ] Heartbeat: `POST /api/devices/{id}/status` with uptime, gpio state
- [ ] Log line every ~5s: realistic messages like "OTA check — no update", "LED1 ON → D0 HIGH", "heap free: 218KB"
- [ ] For LED devices: GPIO state matches last applied preset (or toggles on Blink template)
- [ ] For LCD devices: LCD text matches last applied preset
- [ ] Uptime counter increments correctly
- [ ] Simulation loop starts when device is registered, stops when device is deleted
- [ ] Verify in browser: fleet grid shows increasing uptimes, log page fills with entries

---

## 4. Functional Requirements

- **FR-1:** The system must run entirely on a local Wi-Fi network with no internet dependency
- **FR-2:** PC-B simulator URL (`http://PC-B-IP:3000`) must be accessible from any browser on the network
- **FR-3:** PC-A dashboard URL (`http://PC-A-IP:5173`) must be accessible from any browser on the network
- **FR-4:** All device state changes must propagate to connected browser clients within 500ms via WebSocket
- **FR-5:** Deleting a device on PC-B must remove it from PC-A fleet grid in real time
- **FR-6:** Adding a device on PC-B must appear on PC-A fleet grid without page refresh
- **FR-7:** The LED SVG component must animate (pulse/glow) when HIGH, and be dark when LOW
- **FR-8:** The 16×2 LCD SVG component must display exactly 16 chars per row, 2 rows, with backlight glow
- **FR-9:** The ESP32 SVG board component must be reused across PC-A and PC-B (shared component)
- **FR-10:** OTA progress must be shown as a percentage (0–100%) with a filling progress bar animation
- **FR-11:** The C++ code viewer must display syntax-highlighted Arduino code unique per template type
- **FR-12:** Batch OTA must show individual per-device progress bars in the modal simultaneously
- **FR-13:** The backend must serve all firmware endpoints and device state; neither frontend should maintain authoritative state
- **FR-14:** All HTTP communication from PC-B simulator to PC-A backend must use configurable base URL (env var)

---

## 5. Non-Goals (Out of Scope)

- **Real ESP32 hardware** — demo is 100% simulated; no physical device support needed
- **Authentication / login** — local network demo, no auth required
- **MQTT / cloud messaging** — HTTP + WebSocket only
- **Database persistence** — in-memory state only; restarting the backend resets everything
- **Mobile-responsive UI** — dashboard is fullscreen on a laptop/projector
- **Real binary firmware files** — `.bin` files are placeholder empty files; no real flashing
- **Auto-discovery (mDNS/Zeroconf)** — PC-B connects via configured IP address
- **Multiple user sessions / auth** — single shared session, no user accounts

---

## 6. Design Considerations

- **Dark IoT aesthetic:** Background `#0f172a` slate, accents cyan `#06b6d4`, green `#22c55e`, amber `#f59e0b`, red `#ef4444`
- **ESP32 SVG board:** Blue PCB color, gold pin pads, chip rendered as dark rectangle with label, pin rows on both sides — reusable component
- **LED SVG component:** Circle with radial gradient; ON = yellow/amber + drop-shadow + CSS pulse keyframe; OFF = `#374151` dark grey, no shadow
- **LCD SVG component:** Dark green bg `#0a2e0a`, monospace character cells, amber text `#fbbf24`, ambient glow border
- **Fonts:** Monospace for logs and code (JetBrains Mono or Fira Code via CDN); sans-serif for UI labels
- **Animations:** OTA progress bar — CSS width transition; board flicker during OTA — opacity keyframe; LED pulse — box-shadow keyframe
- **No external UI component library** — build raw with Tailwind utility classes for full control

---

## 7. Technical Considerations

- **Backend:** Python 3.11+, FastAPI, `uvicorn`, `websockets` (built into FastAPI via `python-multipart`)
- **Frontend (both):** React 18, Vite 5, TailwindCSS 3, no UI framework
- **Shared types:** TypeScript interfaces in `shared/types.ts` imported by both frontends
- **WebSocket client:** Native browser `WebSocket` API in a custom React hook (`useWebSocket`)
- **SVG components:** Inline SVG in React — no external diagram library needed
- **Syntax highlighting:** `react-syntax-highlighter` with `atomDark` theme
- **PC-B base URL:** Configured via `.env` file: `VITE_API_BASE=http://192.168.1.10:8000`
- **CORS:** FastAPI `CORSMiddleware` — allow all origins for demo simplicity
- **Simulation loop:** `setInterval` in a React `useEffect` per device, cleaned up on unmount/delete
- **State management:** React `useState` + `useContext` — no Redux/Zustand needed at this scale

---

## 8. Success Metrics

- [ ] Professor can watch 5 ESP32 devices on PC-B, click one, and understand what it does without explanation
- [ ] OTA update initiated from PC-A is visually reflected on PC-B within 1 second
- [ ] Batch update of 4 devices shows 4 simultaneous animated progress bars
- [ ] LED glowing/dark state is self-evident to a non-technical observer
- [ ] C++ code viewer shows syntactically correct, real Arduino OTA sketch
- [ ] Adding a device on PC-B appears on PC-A fleet within 1 second
- [ ] Demo can run for 15 minutes without crashes or refresh

---

## 9. Open Questions

- Should PC-B have a `[Kill Device]` keyboard shortcut for dramatic offline demos, or is the `[✕]` button sufficient?
- Should the batch OTA stagger start times slightly (e.g., 200ms apart) to make parallel bars look more realistic?
- How many presets per template? Currently 3 per device — is that enough for the demo?
- Should the LCD preset text be editable (free-type) or fixed presets only?
- Should the C++ code update to reflect the currently installed firmware version dynamically?
