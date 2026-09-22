from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Any
import asyncio
import json
import os
from datetime import datetime

app = FastAPI(title="IoT OTA Dashboard Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    },
    {
        "version": "v1.1.0",
        "size": 498000,
        "changelog": "GPIO stability improvements and faster OTA polling.",
        "date": "2026-09-10",
    },
    {
        "version": "v1.0.0",
        "size": 480000,
        "changelog": "Initial release.",
        "date": "2026-09-01",
    },
]

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

class DeviceStatus(BaseModel):
    online: Optional[bool] = None
    uptime: Optional[int] = None
    gpio: Optional[dict] = None
    lcd_row1: Optional[str] = None
    lcd_row2: Optional[str] = None
    ota_progress: Optional[int] = None
    state: Optional[str] = None   # 'flashing' | 'complete' | 'error'
    firmware: Optional[str] = None

class LogEntry(BaseModel):
    level: str  # INFO | WARN | ERROR
    msg: str

class GroupCreate(BaseModel):
    name: str

class GroupAssign(BaseModel):
    group: str

class OTAPush(BaseModel):
    device_ids: list[str]
    version: str

class OTARollback(BaseModel):
    device_id: str
    version: str

class ConfigPush(BaseModel):
    device_ids: list[str]
    config: dict

# ─── Helper ───────────────────────────────────────────────────────────────────

def make_device(data: RegisterDevice) -> dict:
    return {
        "id": data.id,
        "mac": data.mac,
        "firmware": data.firmware,
        "group": data.group,
        "template": data.template,
        "online": True,
        "uptime": 0,
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": {"row1": "Hello World!", "row2": "Sys: RUNNING"} if data.template == "lcd" else None,
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
@app.get("/api/firmware")
async def list_firmware():
    result = []
    for fw in FIRMWARE_VERSIONS:
        result.append({**fw, "device_count": device_count_for_version(fw["version"])})
    return result

@app.post("/api/firmware")
async def add_firmware(version: str, changelog: str = ""):
    FIRMWARE_VERSIONS.insert(0, {
        "version": version,
        "size": 500000,
        "changelog": changelog,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
    })
    # Create placeholder file
    fw_dir = os.path.join(os.path.dirname(__file__), "firmware")
    os.makedirs(fw_dir, exist_ok=True)
    with open(os.path.join(fw_dir, f"{version}.bin"), "w") as f:
        f.write(f"Firmware {version}\n{changelog}\n")
    return {"created": version}

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
