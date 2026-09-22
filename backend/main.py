from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Any
import asyncio
import json
import os
import hashlib
import re
from datetime import datetime

app = FastAPI(title="IoT OTA Dashboard Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─── In-memory state ──────────────────────────────────────────────────────────

devices: dict[str, dict] = {}
logs: dict[str, list] = {}
groups: list[str] = ["floor-1", "floor-2", "rooftop"]

FIRMWARE_VERSIONS = [
    {
        "version": "v1.2.0",
        "size": 512000,
        "changelog": "LCD preset support, config push via JSON, improved reconnect logic.",
        "date": "2026-09-20",
        "sha256": "4b82d9f1c7e9a3b2e5d8f0c1a4b7e2d9f8a3c5b7d1e4f6a9b2c8d3e5f7a1b4c6",
        "is_faulty": False,
        "filename": "firmware_v1.2.0.cpp",
        "has_source": True,
    },
    {
        "version": "v1.1.0",
        "size": 498000,
        "changelog": "GPIO stability improvements and faster OTA polling.",
        "date": "2026-09-10",
        "sha256": "7c91e2a4b8d6f0c3e5a7b9d1f4c6e8a0b2d5f7c9e1a3b6d8f0c2e4a7b9d1f3c5",
        "is_faulty": False,
        "filename": "firmware_v1.1.0.cpp",
        "has_source": True,
    },
    {
        "version": "v1.0.0",
        "size": 480000,
        "changelog": "Initial release — basic telemetry and single LED loop.",
        "date": "2026-09-01",
        "sha256": "3a7b9c1d5e8f0a2b4c6e8d0f2a4b6c8e0d2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b",
        "is_faulty": False,
        "filename": "firmware_v1.0.0.cpp",
        "has_source": True,
    },
    {
        "version": "v2.2.0-faulty",
        "size": 524000,
        "changelog": "FAULT SIMULATION: Corrupted heap allocator + infinite watchdog crash loop.",
        "date": "2026-09-22",
        "sha256": "deadbeef8badf00ddeadbeef8badf00ddeadbeef8badf00ddeadbeef8badf00d",
        "is_faulty": True,
        "filename": "firmware_v2.2.0_faulty.cpp",
        "has_source": True,
    },
]

FIRMWARE_CODE = {
    "v1.0.0": """#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";
const int PIN_LED1 = 2;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED1, OUTPUT);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println("[OTA v1.0.0] Boot successful. Connected to AP.");
}

void loop() {
  digitalWrite(PIN_LED1, HIGH);
  delay(1000);
  digitalWrite(PIN_LED1, LOW);
  delay(1000);
}
""",
    "v1.1.0": """#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";
const int PIN_LED1 = 2;
const int PIN_LED2 = 4;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED2, OUTPUT);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
  }
  Serial.println("[OTA v1.1.0] Dual-channel GPIO initialized.");
}

void loop() {
  // Alternating flash pattern
  digitalWrite(PIN_LED1, HIGH);
  digitalWrite(PIN_LED2, LOW);
  delay(400);
  digitalWrite(PIN_LED1, LOW);
  digitalWrite(PIN_LED2, HIGH);
  delay(400);
}
""",
    "v1.2.0": """#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";
const int PIN_LED1 = 2;
const int PIN_LED2 = 4;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED2, OUTPUT);
  
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("ESP32 OTA v1.2.0");
  lcd.setCursor(0, 1);
  lcd.print("State: OPTIMAL");

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }
  Serial.println("[OTA v1.2.0] System running with I2C LCD matrix support.");
}

void loop() {
  // Strobe LED sync
  digitalWrite(PIN_LED1, HIGH);
  digitalWrite(PIN_LED2, HIGH);
  delay(200);
  digitalWrite(PIN_LED1, LOW);
  digitalWrite(PIN_LED2, LOW);
  delay(600);
}
""",
    "v2.2.0-faulty": """#include <WiFi.h>
#include <esp_system.h>
#include <esp_heap_caps.h>

const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";

void setup() {
  Serial.begin(115200);
  Serial.println(">>> CRITICAL ERROR: FIRMWARE v2.2.0 CORRUPTED HEAP <<<");
  delay(800);
  // Simulate memory corruption / Watchdog abort
  volatile int* p = (volatile int*)0x00000000;
  Serial.println("Guru Meditation Error: Core 0 panic'ed (LoadProhibited). Exception was unhandled.");
  Serial.println("Core 0 register dump: PC=0x40081234 PS=0x00060020 A0=0x80084567");
  delay(400);
  esp_restart(); // Infinite crash loop
}

void loop() {
  // Unreachable
}
""",
}

# ─── WebSocket connection manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, event_type: str, device_id: str, payload: Any):
        msg = json.dumps({"type": event_type, "device_id": device_id, "payload": payload})
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

# ─── Pydantic models ───────────────────────────────────────────────────────────

class RegisterDevice(BaseModel):
    id: str
    mac: str
    firmware: str
    group: str
    template: str  # 'led' | 'lcd'
    name: Optional[str] = None
    heartbeat_rate: Optional[int] = 5

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    heartbeat_rate: Optional[int] = None

class DeviceStatus(BaseModel):
    online: Optional[bool] = None
    uptime: Optional[int] = None
    gpio: Optional[dict] = None
    lcd_row1: Optional[str] = None
    lcd_row2: Optional[str] = None
    ota_progress: Optional[int] = None
    state: Optional[str] = None   # 'flashing' | 'complete' | 'error'
    firmware: Optional[str] = None
    temp: Optional[str] = None
    heap: Optional[str] = None
    rssi: Optional[int] = None
    ip: Optional[str] = None
    last_heartbeat: Optional[str] = None

class LogEntry(BaseModel):
    level: str  # INFO | WARN | ERROR
    msg: str

class GroupCreate(BaseModel):
    name: str

class GroupAssign(BaseModel):
    group: str

class GroupOTAPush(BaseModel):
    group: str
    version: str

class OTAPush(BaseModel):
    device_ids: list[str]
    version: str

class OTARollback(BaseModel):
    device_id: str
    version: str

class ConfigPush(BaseModel):
    device_ids: list[str]
    config: dict

class FirmwareUploadJSON(BaseModel):
    version: Optional[str] = None
    changelog: Optional[str] = ""
    filename: Optional[str] = "firmware.cpp"
    code: Optional[str] = None
    size: Optional[int] = None

# ─── Helper ───────────────────────────────────────────────────────────────────

def make_device(data: RegisterDevice) -> dict:
    idx = len(devices) + 1
    known_ips = {
        "ESP-A1F3": "192.168.1.101",
        "ESP-B2C4": "192.168.1.102",
        "ESP-C9D1": "192.168.1.103",
    }
    ip = known_ips.get(data.id, f"192.168.1.{100 + idx}")
    return {
        "id": data.id,
        "name": getattr(data, "name", None) or data.id,
        "mac": data.mac,
        "firmware": data.firmware,
        "group": data.group,
        "template": data.template,
        "online": True,
        "uptime": 0,
        "heartbeat_rate": getattr(data, "heartbeat_rate", None) or 5,
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": {"row1": "Hello World!", "row2": "Sys: RUNNING"} if data.template == "lcd" else None,
        "temp": "32.0 °C",
        "heap": "214 KB",
        "rssi": -58,
        "ip": ip,
        "last_heartbeat": datetime.utcnow().strftime("%I:%M:%S %p"),
        "ota_pending": None,
        "ota_progress": None,
        "config": {},
        "registered_at": datetime.utcnow().isoformat(),
    }

def device_count_for_version(version: str) -> int:
    return sum(1 for d in devices.values() if d["firmware"] == version)

# ─── Seed demo devices ────────────────────────────────────────────────────────

def seed_demo_devices():
    demo = [
        RegisterDevice(id="ESP-A1F3", mac="A1:F3:00:11:22:33", firmware="v1.1.0", group="floor-1", template="led"),
        RegisterDevice(id="ESP-B2C4", mac="B2:C4:00:11:22:33", firmware="v1.2.0", group="floor-1", template="lcd"),
        RegisterDevice(id="ESP-C9D1", mac="C9:D1:00:11:22:33", firmware="v1.0.0", group="floor-2", template="led"),
    ]
    for d in demo:
        devices[d.id] = make_device(d)
        logs[d.id] = []

seed_demo_devices()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "IoT OTA Backend", "devices": len(devices)}

@app.get("/health")
async def health():
    return {"status": "healthy", "devices": len(devices)}

# Device registry
@app.post("/api/devices/register")
async def register_device(data: RegisterDevice):
    device = make_device(data)
    devices[data.id] = device
    if data.id not in logs:
        logs[data.id] = []
    await manager.broadcast("device_registered", data.id, device)
    return device

@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: str):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    del devices[device_id]
    logs.pop(device_id, None)
    await manager.broadcast("device_removed", device_id, {})
    return {"deleted": device_id}

@app.get("/api/devices")
async def list_devices():
    return list(devices.values())

@app.get("/api/devices/{device_id}")
async def get_device(device_id: str):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    return devices[device_id]

@app.post("/api/devices/{device_id}/status")
async def update_status(device_id: str, status: DeviceStatus):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    d = devices[device_id]
    if status.online is not None:
        d["online"] = status.online
    if status.uptime is not None:
        d["uptime"] = status.uptime
    if status.gpio is not None:
        d["gpio"] = status.gpio
    if status.lcd_row1 is not None:
        if d["lcd"] is None:
            d["lcd"] = {"row1": "", "row2": ""}
        d["lcd"]["row1"] = status.lcd_row1
    if status.lcd_row2 is not None:
        if d["lcd"] is None:
            d["lcd"] = {"row1": "", "row2": ""}
        d["lcd"]["row2"] = status.lcd_row2
    if status.ota_progress is not None:
        d["ota_progress"] = status.ota_progress
    if status.state == "complete":
        d["ota_pending"] = None
        d["ota_progress"] = None
        if status.firmware:
            d["firmware"] = status.firmware
        await manager.broadcast("ota_complete", device_id, {"firmware": d["firmware"]})
    elif status.ota_progress is not None:
        await manager.broadcast("ota_progress", device_id, {"progress": status.ota_progress})
    else:
        await manager.broadcast("device_status", device_id, d)
    return d

# Logs
@app.post("/api/devices/{device_id}/logs")
async def append_log(device_id: str, entry: LogEntry):
    if device_id not in logs:
        logs[device_id] = []
    log_entry = {
        "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
        "level": entry.level,
        "msg": entry.msg,
        "device_id": device_id,
    }
    logs[device_id].append(log_entry)
    if len(logs[device_id]) > 100:
        logs[device_id] = logs[device_id][-100:]
    await manager.broadcast("device_log", device_id, log_entry)
    return log_entry

@app.get("/api/devices/{device_id}/logs")
async def get_logs(device_id: str):
    return logs.get(device_id, [])

# Firmware
def compute_next_version() -> str:
    versions = [fw["version"] for fw in FIRMWARE_VERSIONS if not fw.get("is_faulty")]
    for v in versions:
        m = re.match(r"v?(\d+)\.(\d+)\.(\d+)", v)
        if m:
            major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return f"v{major}.{minor + 1}.0"
    return "v1.3.0"

async def register_firmware_entry(
    version: Optional[str],
    changelog: str,
    filename: str,
    content_bytes: bytes,
    code_str: Optional[str] = None
):
    if not version or not version.strip():
        m = re.search(r"v\d+\.\d+\.\d+", filename)
        if m:
            ver = m.group(0)
        else:
            ver = compute_next_version()
    else:
        ver = version.strip()
        if not ver.startswith("v") and ver[0].isdigit():
            ver = f"v{ver}"

    sha256_hash = hashlib.sha256(content_bytes).hexdigest()
    file_size = len(content_bytes) if len(content_bytes) > 0 else 512000

    is_source = False
    source_exts = (".c", ".cpp", ".ino", ".h", ".hpp", ".txt")
    if filename.lower().endswith(source_exts) or code_str:
        is_source = True
        if code_str:
            FIRMWARE_CODE[ver] = code_str
        else:
            try:
                FIRMWARE_CODE[ver] = content_bytes.decode("utf-8")
            except Exception:
                FIRMWARE_CODE[ver] = content_bytes.decode("latin-1", errors="replace")

    fw_dir = os.path.join(os.path.dirname(__file__), "firmware")
    os.makedirs(fw_dir, exist_ok=True)
    bin_path = os.path.join(fw_dir, f"{ver}.bin")
    with open(bin_path, "wb") as f:
        f.write(content_bytes if content_bytes else f"Firmware {ver}\n{changelog}".encode())

    if is_source and ver in FIRMWARE_CODE:
        src_path = os.path.join(fw_dir, f"{ver}.cpp")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(FIRMWARE_CODE[ver])

    existing = next((fw for fw in FIRMWARE_VERSIONS if fw["version"] == ver), None)
    entry = {
        "version": ver,
        "size": file_size,
        "changelog": changelog or f"Uploaded {filename} with verified SHA-256 integrity.",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "sha256": sha256_hash,
        "is_faulty": "faulty" in ver.lower(),
        "filename": filename,
        "has_source": is_source or (ver in FIRMWARE_CODE),
    }

    if existing:
        existing.update(entry)
    else:
        FIRMWARE_VERSIONS.insert(0, entry)

    await manager.broadcast("firmware_added", ver, entry)
    return entry

@app.get("/api/firmware")
async def list_firmware():
    result = []
    for fw in FIRMWARE_VERSIONS:
        result.append({**fw, "device_count": device_count_for_version(fw["version"])})
    return result

@app.post("/api/firmware")
async def add_firmware(version: str, changelog: str = ""):
    entry = await register_firmware_entry(
        version=version,
        changelog=changelog,
        filename=f"{version}.bin",
        content_bytes=f"Firmware {version}\n{changelog}\n".encode()
    )
    return {"created": version, "entry": entry}

@app.post("/api/firmware/upload")
async def upload_firmware(
    file: UploadFile = File(...),
    version: Optional[str] = Form(None),
    changelog: Optional[str] = Form("")
):
    content = await file.read()
    filename = file.filename or "firmware.bin"
    entry = await register_firmware_entry(
        version=version,
        changelog=changelog or "",
        filename=filename,
        content_bytes=content
    )
    return entry

@app.post("/api/firmware/upload-source")
async def upload_firmware_source(payload: FirmwareUploadJSON):
    code_str = payload.code or "// No source code provided\n"
    content_bytes = code_str.encode("utf-8")
    entry = await register_firmware_entry(
        version=payload.version,
        changelog=payload.changelog or "",
        filename=payload.filename or "firmware.cpp",
        content_bytes=content_bytes,
        code_str=code_str
    )
    return entry

@app.get("/api/firmware/{version}/code")
async def get_firmware_code(version: str):
    code = FIRMWARE_CODE.get(version, "// Custom uploaded firmware binary - source not indexed\n")
    return {"version": version, "code": code}

# Device Update (Metadata, Name, Group, Heartbeat)
@app.patch("/api/devices/{device_id}")
async def update_device_meta(device_id: str, data: DeviceUpdate):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    d = devices[device_id]
    if data.name is not None:
        d["name"] = data.name
    if data.group is not None:
        d["group"] = data.group
    if data.heartbeat_rate is not None:
        d["heartbeat_rate"] = data.heartbeat_rate
    await manager.broadcast("device_status", device_id, d)
    return d

# OTA
@app.post("/api/ota/push")
async def push_ota(data: OTAPush):
    results = []
    for did in data.device_ids:
        if did in devices:
            devices[did]["ota_pending"] = data.version
            devices[did]["ota_progress"] = 0
            await manager.broadcast("ota_started", did, {
                "from_version": devices[did]["firmware"],
                "to_version": data.version,
            })
            results.append(did)
    return {"pushed": results, "version": data.version}

@app.post("/api/ota/group")
async def push_ota_group(data: GroupOTAPush):
    target_ids = [d["id"] for d in devices.values() if d["group"] == data.group]
    if not target_ids:
        raise HTTPException(status_code=404, detail="No devices found in this group")
    for did in target_ids:
        devices[did]["ota_pending"] = data.version
        devices[did]["ota_progress"] = 0
        await manager.broadcast("ota_started", did, {
            "from_version": devices[did]["firmware"],
            "to_version": data.version,
        })
    return {"group": data.group, "pushed": target_ids, "version": data.version}

@app.post("/api/ota/rollback")
async def rollback_ota(data: OTARollback):
    if data.device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    devices[data.device_id]["ota_pending"] = data.version
    devices[data.device_id]["ota_progress"] = 0
    await manager.broadcast("ota_started", data.device_id, {
        "from_version": devices[data.device_id]["firmware"],
        "to_version": data.version,
    })
    return {"rollback": data.device_id, "to": data.version}

@app.post("/api/ota/reset")
async def reset_firmware(data: OTARollback):
    return await rollback_ota(data)

@app.get("/ota/update/{device_id}")
async def ota_check(device_id: str):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    d = devices[device_id]
    if d.get("ota_pending"):
        version = d["ota_pending"]
        fw_path = os.path.join(os.path.dirname(__file__), "firmware", f"{version}.bin")
        if os.path.exists(fw_path):
            return FileResponse(fw_path, media_type="application/octet-stream",
                                headers={"X-Firmware-Version": version})
        raise HTTPException(status_code=404, detail="Firmware file not found")
    # No update pending
    from fastapi.responses import Response
    return Response(status_code=304)

# Groups
@app.get("/api/groups")
async def list_groups():
    result = []
    for g in groups:
        count = sum(1 for d in devices.values() if d["group"] == g)
        result.append({"name": g, "device_count": count})
    return result

@app.post("/api/groups")
async def create_group(data: GroupCreate):
    if data.name not in groups:
        groups.append(data.name)
    return {"name": data.name}

@app.put("/api/devices/{device_id}/group")
async def assign_group(device_id: str, data: GroupAssign):
    if device_id not in devices:
        raise HTTPException(status_code=404, detail="Device not found")
    devices[device_id]["group"] = data.group
    await manager.broadcast("device_status", device_id, devices[device_id])
    return devices[device_id]

# Config push
@app.post("/api/config/push")
async def push_config(data: ConfigPush):
    for did in data.device_ids:
        if did in devices:
            devices[did]["config"] = data.config
            await manager.broadcast("config_pushed", did, {"config": data.config})
            # Also log it
            if did in logs:
                log_entry = {
                    "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
                    "level": "INFO",
                    "msg": f"Config received: {json.dumps(data.config)}",
                    "device_id": did,
                }
                logs[did].append(log_entry)
                await manager.broadcast("device_log", did, log_entry)
    return {"pushed_to": data.device_ids}

# ─── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current device state on connect
    try:
        for device in devices.values():
            await websocket.send_text(json.dumps({
                "type": "device_registered",
                "device_id": device["id"],
                "payload": device,
            }))
        while True:
            # Keep connection alive — we only push, not receive
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping", "device_id": "", "payload": {}}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
