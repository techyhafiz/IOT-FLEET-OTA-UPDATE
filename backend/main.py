from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
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
groups: list[str] = ["floor-1", "floor-2", "floor-3", "rooftop"]

# Last state broadcast per device — used to suppress redundant WS traffic
_last_broadcast: dict[str, str] = {}

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

# ─── Predefined firmware library ────────────────────────────────────────────

# Seconds between OTA retries while a device is powered off / unreachable
OTA_RETRY_S = 10

OTA_BASE_INCLUDES = '''#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>

// OTA platform connection — every predefined build polls for updates
const char* ssid       = "Fleet_IoT_Mesh";
const char* password   = "SecretPass123";
const char* ota_host   = "192.168.1.10";   // PC-A gateway
const int   ota_port   = 8000;
const char* device_id  = ESP_DEVICE_ID;

void checkOTA() {
  String url = "/ota/update/" + String(device_id);
  WiFiClient client;
  t_httpUpdate_return ret = httpUpdate.update(client, ota_host, ota_port, url);
  if (ret == HTTP_UPDATE_OK) {
    ESP.restart();
  }
}'''

PREDEFINED_FIRMWARE: dict[str, dict] = {
    "LED_D0": {
        "id": "LED_D0", "template": "led", "targets": ["D0"],
        "name": "LED ×1 — D0 HIGH",
        "desc": "Turns LED on D0 HIGH (all other pins LOW).",
        "version": "v2.0.0",
        "gpio": {"D0": 1, "D1": 0, "D2": 0, "D3": 0},
        "lcd": None, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

const int PIN_D0 = 16;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_D0, OUTPUT);
  digitalWrite(PIN_D0, HIGH);   // D0 → LED 1 ON
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LED_D0] D0 HIGH, OTA platform linked.");
}

void loop() {
  digitalWrite(PIN_D0, HIGH);   // hold D0 HIGH
  delay(1000);
  checkOTA();                    // poll for updates
}''',
    },
    "LED_D1": {
        "id": "LED_D1", "template": "led", "targets": ["D1"],
        "name": "LED ×1 — D1 HIGH",
        "desc": "Turns LED on D1 HIGH (all other pins LOW).",
        "version": "v2.1.0",
        "gpio": {"D0": 0, "D1": 1, "D2": 0, "D3": 0},
        "lcd": None, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

const int PIN_D1 = 17;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_D1, OUTPUT);
  digitalWrite(PIN_D1, HIGH);   // D1 → LED 2 ON
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LED_D1] D1 HIGH, OTA platform linked.");
}

void loop() {
  digitalWrite(PIN_D1, HIGH);   // hold D1 HIGH
  delay(1000);
  checkOTA();
}''',
    },
    "LED_D2": {
        "id": "LED_D2", "template": "led", "targets": ["D2"],
        "name": "LED ×1 — D2 HIGH",
        "desc": "Turns LED on D2 HIGH (all other pins LOW).",
        "version": "v2.2.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 1, "D3": 0},
        "lcd": None, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

const int PIN_D2 = 18;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_D2, OUTPUT);
  digitalWrite(PIN_D2, HIGH);   // D2 → LED 3 ON
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LED_D2] D2 HIGH, OTA platform linked.");
}

void loop() {
  digitalWrite(PIN_D2, HIGH);   // hold D2 HIGH
  delay(1000);
  checkOTA();
}''',
    },
    "LED_D3": {
        "id": "LED_D3", "template": "led", "targets": ["D3"],
        "name": "LED ×1 — D3 HIGH",
        "desc": "Turns LED on D3 HIGH (all other pins LOW).",
        "version": "v2.3.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 1},
        "lcd": None, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

const int PIN_D3 = 19;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_D3, OUTPUT);
  digitalWrite(PIN_D3, HIGH);   // D3 → LED 4 ON
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LED_D3] D3 HIGH, OTA platform linked.");
}

void loop() {
  digitalWrite(PIN_D3, HIGH);   // hold D3 HIGH
  delay(1000);
  checkOTA();
}''',
    },
    "LED_ALL_OFF": {
        "id": "LED_ALL_OFF", "template": "led", "targets": [],
        "name": "LED — ALL OFF (base)",
        "desc": "All LED pins LOW. Pure OTA-platform connection build.",
        "version": "v1.9.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": None, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

const int PINS[4] = {16, 17, 18, 19};  // D0, D1, D2, D3

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) {
    pinMode(PINS[i], OUTPUT);
    digitalWrite(PINS[i], LOW);   // all LEDs OFF
  }
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE BASE] All pins LOW, OTA platform linked.");
}

void loop() {
  delay(1000);
  checkOTA();
}''',
    },
    "LCD_BLANK": {
        "id": "LCD_BLANK", "template": "lcd", "targets": [],
        "name": "LCD — Blank (base)",
        "desc": "Backlight on, no text yet. Pure OTA-platform connection build.",
        "version": "v3.8.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": {"row1": "", "row2": ""}, "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);          // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();             // screen powered, no text yet
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LCD_BASE] Backlight on, OTA platform linked.");
}

void loop() {
  delay(1000);
  checkOTA();
}''',
    },
    "LCD_GREETING": {
        "id": "LCD_GREETING", "template": "lcd", "targets": [],
        "name": "LCD — Greeting",
        "desc": 'Row 1: "Hello from PC-A" · Row 2: "OTA platform OK".',
        "version": "v3.0.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": {"row1": "Hello from PC-A", "row2": "OTA platform OK"},
        "dynamic": None,
        "code": OTA_BASE_INCLUDES + '''

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);  // I2C addr 0x27, 16 cols, 2 rows

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);          // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Hello from PC-A");
  lcd.setCursor(0, 1);
  lcd.print("OTA platform OK");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LCD_GREETING] LCD ready, OTA linked.");
}

void loop() {
  delay(1000);
  checkOTA();
}''',
    },
    "LCD_IP": {
        "id": "LCD_IP", "template": "lcd", "targets": [],
        "name": "LCD — IP & Signal",
        "desc": "Row 1: node IP address · Row 2: live RSSI signal.",
        "version": "v3.1.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": None, "dynamic": "ip",
        "code": OTA_BASE_INCLUDES + '''

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  lcd.setCursor(0, 0);
  lcd.print(WiFi.localIP());
  lcd.setCursor(0, 1);
  lcd.print("RSSI:");
  Serial.println("[FIRMWARE LCD_IP] Network info build.");
}

void loop() {
  lcd.setCursor(6, 1);
  lcd.print(WiFi.RSSI());
  lcd.print("dBm     ");
  delay(1000);
  checkOTA();
}''',
    },
    "LCD_UPTIME": {
        "id": "LCD_UPTIME", "template": "lcd", "targets": [],
        "name": "LCD — Uptime Counter",
        "desc": "Row 1: firmware tag · Row 2: live seconds-uptime counter.",
        "version": "v3.2.0",
        "gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0},
        "lcd": None, "dynamic": "uptime",
        "code": OTA_BASE_INCLUDES + '''

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("UP-TIME v3.2.0");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
  Serial.println("[FIRMWARE LCD_UPTIME] Counter build.");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print("Up: ");
  lcd.print(millis() / 1000);
  lcd.print(" sec      ");
  delay(1000);
  checkOTA();
}''',
    },
}

def register_predefined_firmware():
    """Index presets into the firmware registry + code store at startup."""
    def vkey(v):
        m = re.match(r"v(\d+)\.(\d+)\.(\d+)", v)
        return tuple(map(int, m.groups())) if m else (0, 0, 0)
    for p in sorted(PREDEFINED_FIRMWARE.values(), key=lambda p: vkey(p["version"]), reverse=True):
        if not any(fw["version"] == p["version"] for fw in FIRMWARE_VERSIONS):
            FIRMWARE_VERSIONS.insert(0, {
                "version": p["version"],
                "size": len(p["code"].encode("utf-8")),
                "changelog": f"[Preset · {p['name']}] {p['desc']}",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "sha256": hashlib.sha256(p["code"].encode("utf-8")).hexdigest(),
                "is_faulty": False,
                "filename": f"{p['id'].lower()}.cpp",
                "has_source": True,
            })
        FIRMWARE_CODE[p["version"]] = p["code"]

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

register_predefined_firmware()

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
    # External hardware chosen at add time (sim mode): how many LEDs are
    # physically wired (3 → D0..D2), or null for the LCD board.
    led_count: Optional[int] = None

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
        "ESP-D4E2": "192.168.1.104",
        "ESP-E5F3": "192.168.1.105",
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
        "lcd": {"row1": "", "row2": ""} if data.template == "lcd" else None,
        "fw_dynamic": None,
        "ota_state": None,
        "ip": ip,
        "last_heartbeat": datetime.now().strftime("%I:%M:%S %p"),
        "ota_pending": None,
        "ota_progress": None,
        "config": {},
        "registered_at": datetime.now().isoformat(),
    }
    # The registered firmware immediately drives the hardware — a device
    # added with LED_D1 firmware shows D1 HIGH from first boot; base builds
    # (v1.9.0 LED / v3.8.0 LCD) boot with everything OFF / blank.
    b = behavior_for_version(data.firmware)
    device["gpio"] = dict(b["gpio"])
    device["lcd"] = dict(b["lcd"]) if b["lcd"] else (
        {"row1": "", "row2": ""} if b["template"] == "lcd" else None
    )
    device["fw_dynamic"] = b["dynamic"]
    device["template"] = b["template"]
    # External hardware wired at add time — clamped to 1..4 so GPIO mapping
    # stays valid. Devices added with a 2-LED harness only show 3 physical
    # LEDs (D0..D2) — extra pins are unwired.
    if data.led_count is not None:
        device["led_count"] = max(1, min(4, data.led_count))
    return device

def device_count_for_version(version: str) -> int:
    return sum(1 for d in devices.values() if d["firmware"] == version)

# ─── Firmware behaviour engine ────────────────────────────────────────────────
# Maps a firmware's C source onto the simulated hardware: which GPIOs it drives
# and what it renders on the LCD. Presets carry explicit behaviour; hand-edited
# code is analysed so custom sketches still drive the virtual device.

PIN_MAP = {"D0": 16, "D1": 17, "D2": 18, "D3": 19}
GPIO_NUM_TO_LOGICAL = {v: k for k, v in PIN_MAP.items()}

def analyze_firmware(code: str) -> dict:
    """Extract {gpio, lcd, dynamic, template} from ESP32 Arduino C source."""
    gpio = {"D0": 0, "D1": 0, "D2": 0, "D3": 0}
    lcd = None
    dynamic = None

    # pinMode(PIN Dx / N, OUTPUT) — pins this sketch drives
    driven: set[str] = set()
    for logical, num in PIN_MAP.items():
        if re.search(rf"pinMode\s*\(\s*(?:PIN_{logical}|{num})\b", code):
            driven.add(logical)

    # digitalWrite(PIN Dx / N, HIGH|LOW)
    for logical, num in PIN_MAP.items():
        m = re.search(
            rf"digitalWrite\s*\(\s*(?:PIN_{logical}|{num})\b\s*,\s*(HIGH|LOW)\s*\)",
            code,
        )
        if m and logical in driven:
            gpio[logical] = 1 if m.group(1) == "HIGH" else 0
        elif logical in driven:
            gpio[logical] = 0

    # LiquidCrystal usage → LCD template
    uses_lcd = re.search(r"LiquidCrystal_I2C|lcd\.init\s*\(\s*\)", code) is not None

    # lcd.setCursor(row) followed by lcd.print("text") — rows 0/1
    rows: dict[int, str] = {}
    for m in re.finditer(
        r"lcd\.setCursor\s*\(\s*\d+\s*,\s*([01])\s*\)\s*;?\s*(?:/[*/].*?\n)?\s*"
        r"lcd\.print\s*\(\s*\"([^\"]*)\"\s*\)",
        code,
    ):
        row = int(m.group(1))
        text = m.group(2)[:16]
        if text and not re.match(r"^RSSI:$|^Up: $", text):
            rows[row] = text
    if uses_lcd:
        lcd = {
            "row1": rows.get(0, ""),
            "row2": rows.get(1, ""),
        }
        if re.search(r"WiFi\.localIP\s*\(\s*\)", code) and lcd["row1"] == "":
            dynamic = "ip"
        if re.search(r"millis\s*\(\s*\)\s*/\s*1000", code):
            dynamic = "uptime"

    template = "lcd" if uses_lcd else "led"
    return {"gpio": gpio, "lcd": lcd, "dynamic": dynamic, "template": template}

def behavior_for_version(version: str) -> dict:
    """Behaviour of a firmware. Latest-uploaded code wins (so hand-edited
    presets behave as edited), then explicit preset behaviour, then analysis."""
    code = FIRMWARE_CODE.get(version)
    if code:
        return analyze_firmware(code)
    for p in PREDEFINED_FIRMWARE.values():
        if p["version"] == version:
            return {
                "gpio": dict(p["gpio"]),
                "lcd": dict(p["lcd"]) if p["lcd"] else None,
                "dynamic": p["dynamic"],
                "template": p["template"],
            }
    return {"gpio": {"D0": 0, "D1": 0, "D2": 0, "D3": 0}, "lcd": None,
            "dynamic": None, "template": "led"}

# ─── Seed demo devices ────────────────────────────────────────────────────────

def seed_demo_devices():
    demo = [
        # Demo fleet: 5 devices across floor-1/2/3, all on base OTA-platform
        # builds (everything OFF / blank). Firmware arrives via OTA pushes.
        RegisterDevice(id="ESP-A1F3", mac="A1:F3:00:11:22:33", firmware="v1.9.0", group="floor-1", template="led"),
        RegisterDevice(id="ESP-B2C4", mac="B2:C4:00:11:22:33", firmware="v3.8.0", group="floor-1", template="lcd"),
        RegisterDevice(id="ESP-C9D1", mac="C9:D1:00:11:22:33", firmware="v1.9.0", group="floor-2", template="led"),
        RegisterDevice(id="ESP-D4E2", mac="D4:E2:00:11:22:33", firmware="v3.8.0", group="floor-2", template="lcd"),
        RegisterDevice(id="ESP-E5F3", mac="E5:F3:00:11:22:33", firmware="v1.9.0", group="floor-3", template="led"),
    ]
    for d in demo:
        devices[d.id] = make_device(d)
        logs[d.id] = []

seed_demo_devices()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "IoT OTA Backend", "devices": len(devices)}

# Device registry
@app.post("/api/devices/register")
async def register_device(data: RegisterDevice):
    device = make_device(data)
    devices[data.id] = device
    if data.id not in logs:
        logs[data.id] = []
    await manager.broadcast("device_registered", data.id, device)
    return device

@app.get("/api/firmware/versions")
async def list_firmware_versions():
    """Lightweight list of known firmware versions for device-side pickers."""
    return [fw["version"] for fw in FIRMWARE_VERSIONS]

@app.get("/api/firmware/presets")
async def list_presets():
    """Predefined firmware library — variations for LED (D0–D3) and LCD,
    plus the base OTA-only builds. Code included so the dashboard can offer
    viewing and hand-editing before upload."""
    result = []
    for p in PREDEFINED_FIRMWARE.values():
        result.append({
            "id": p["id"],
            "template": p["template"],
            "name": p["name"],
            "desc": p["desc"],
            "version": p["version"],
            "targets": p["targets"],
            "gpio": p["gpio"],
            "lcd": p["lcd"],
            "dynamic": p["dynamic"],
            "code": p["code"],
        })
    return result

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
    # Power-cycle recovery: a device bricked by cross-template firmware comes
    # back on its base build (template is permanent; the bad image is gone).
    if d.get("ota_state") == "incompatible" and status.online:
        base = "v3.8.0" if d["template"] == "lcd" else "v1.9.0"
        d["ota_state"] = None
        d["ota_pending"] = None
        d["ota_progress"] = None
        d["firmware"] = base
        rb = behavior_for_version(base)
        d["gpio"] = dict(rb["gpio"])
        d["lcd"] = dict(rb["lcd"]) if rb["lcd"] else (
            {"row1": "", "row2": ""} if d["template"] == "lcd" else None
        )
        d["fw_dynamic"] = rb["dynamic"]
        log_entry = {
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "level": "INFO",
            "msg": f"Power cycle OK — recovered to base build {base}",
            "device_id": device_id,
        }
        logs[device_id].append(log_entry)
        if len(logs[device_id]) > 100:
            logs[device_id] = logs[device_id][-100:]
        await manager.broadcast("device_log", device_id, log_entry)
        _last_broadcast[device_id] = json.dumps(d, sort_keys=True, default=str)
        await manager.broadcast("device_status", device_id, d)
        return d
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
    if status.temp is not None:
        d["temp"] = status.temp
    if status.heap is not None:
        d["heap"] = status.heap
    if status.rssi is not None:
        d["rssi"] = status.rssi
    if status.ip is not None:
        d["ip"] = status.ip
    # Every status post IS a heartbeat
    d["last_heartbeat"] = datetime.utcnow().strftime("%I:%M:%S %p")

    if status.state == "complete":
        target = d.get("ota_pending")
        # A device can only "complete" the update it was offered.
        if target and status.firmware != target:
            # Reject bogus completion reports; treat as a normal heartbeat.
            status.state = None
        if status.state == "complete":
            d["ota_pending"] = None
            d["ota_progress"] = None
            d["ota_state"] = None
            if status.firmware:
                d["firmware"] = status.firmware
                # Template is permanent per device (project rule). Flashing a
                # firmware built for the other hardware kind "succeeds" on the
                # wire but the device never comes back: it shows INCOMPATIBLE
                # and stops heartbeating until powered off/on (which reverts to
                # its base build — the demo recovery story).
                new_b = behavior_for_version(status.firmware)
                if new_b["template"] != d["template"]:
                    d["ota_state"] = "incompatible"
                    d["online"] = False
                    d["gpio"] = {"D0": 0, "D1": 0, "D2": 0, "D3": 0}
                    d["lcd"] = {"row1": "", "row2": ""} if d["template"] == "lcd" else None
                    log_entry = {
                        "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                        "level": "ERROR",
                        "msg": f"Boot failed: firmware {status.firmware} not compatible with {d['template'].upper()} hardware — no response",
                        "device_id": device_id,
                    }
                    logs[device_id].append(log_entry)
                    if len(logs[device_id]) > 100:
                        logs[device_id] = logs[device_id][-100:]
                    await manager.broadcast("device_log", device_id, log_entry)
                    _last_broadcast[device_id] = json.dumps(d, sort_keys=True, default=str)
                    await manager.broadcast("ota_complete", device_id, d)
                    return d
                # The flashed firmware now drives the hardware — exactly like a
                # real ESP32 booting a new sketch. Preset behaviours are explicit;
                # custom/edited code is analysed from its C source.
                b = behavior_for_version(d["firmware"])
                d["gpio"] = dict(b["gpio"])
                d["lcd"] = dict(b["lcd"]) if b["lcd"] else (
                    {"row1": "", "row2": ""} if b["template"] == "lcd" else None
                )
                d["fw_dynamic"] = b["dynamic"]
                d["template"] = b["template"]
            log_entry = {
                "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                "level": "INFO",
                "msg": f"Firmware updated to {d['firmware']} ✓",
                "device_id": device_id,
            }
            logs[device_id].append(log_entry)
            if len(logs[device_id]) > 100:
                logs[device_id] = logs[device_id][-100:]
            await manager.broadcast("device_log", device_id, log_entry)
        else:
            status.state = None
    if status.state == "failed":
        d["ota_state"] = "failed"
        log_entry = {
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "level": "WARN",
            "msg": f"Update failed — device offline. Retrying every {OTA_RETRY_S}s…",
            "device_id": device_id,
        }
        logs[device_id].append(log_entry)
        if len(logs[device_id]) > 100:
            logs[device_id] = logs[device_id][-100:]
        await manager.broadcast("device_log", device_id, log_entry)
    if status.state == "recovered":
        # Powered back on with the update still pending → flash now succeeds.
        if d.get("ota_pending"):
            target = d["ota_pending"]
            d["ota_pending"] = None
            d["ota_progress"] = None
            d["ota_state"] = None
            d["firmware"] = target
            b = behavior_for_version(target)
            d["gpio"] = dict(b["gpio"])
            d["lcd"] = dict(b["lcd"]) if b["lcd"] else (
                {"row1": "", "row2": ""} if b["template"] == "lcd" else None
            )
            d["fw_dynamic"] = b["dynamic"]
            log_entry = {
                "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                "level": "INFO",
                "msg": f"Device back online — retry succeeded, firmware updated to {target} ✓",
                "device_id": device_id,
            }
            logs[device_id].append(log_entry)
            if len(logs[device_id]) > 100:
                logs[device_id] = logs[device_id][-100:]
            await manager.broadcast("device_log", device_id, log_entry)
        else:
            d["ota_state"] = None
    if status.ota_progress is not None and status.state is None:
        # Flash progress — broadcast the full device, clients merge directly
        _last_broadcast[device_id] = json.dumps(d, sort_keys=True, default=str)
        await manager.broadcast("ota_progress", device_id, d)
        return d
    # Suppress redundant heartbeats: skip if the visible state is unchanged
    snapshot = json.dumps(d, sort_keys=True, default=str)
    if _last_broadcast.get(device_id) != snapshot:
        _last_broadcast[device_id] = snapshot
        await manager.broadcast("device_status", device_id, d)
    return d

# Logs
@app.post("/api/devices/{device_id}/logs")
async def append_log(device_id: str, entry: LogEntry):
    if device_id not in logs:
        logs[device_id] = []
    log_entry = {
        # Local wall-clock (matches device-side timestamps); utcnow() made the
        # log feed show two different times mixed together.
        "timestamp": datetime.now().strftime("%H:%M:%S"),
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
    """Smallest unused vX.(Y+1).0 above the highest known version."""
    best = (1, 0, 0)
    for fw in FIRMWARE_VERSIONS:
        m = re.match(r"v?(\d+)\.(\d+)\.(\d+)", fw["version"])
        if m:
            t = tuple(int(m.group(i)) for i in (1, 2, 3))
            if t > best:
                best = t
    return f"v{best[0]}.{best[1] + 1}.0"

async def register_firmware_entry(
    version: Optional[str],
    changelog: str,
    filename: str,
    content_bytes: bytes,
    code_str: Optional[str] = None
):
    if not version or not version.strip():
        m = re.search(r"v\d+\.\d+\.\d+", filename)
        ver = m.group(0) if m else compute_next_version()
    else:
        ver = version.strip()
        if not ver.startswith("v") and ver and ver[0].isdigit():
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

    entry = {
        "version": ver,
        "size": file_size,
        "changelog": changelog or f"Uploaded {filename} with verified SHA-256 integrity.",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "sha256": sha256_hash,
        "is_faulty": "faulty" in ver.lower(),
        "filename": filename,
        "has_source": is_source or (ver in FIRMWARE_CODE),
    }

    existing = next((fw for fw in FIRMWARE_VERSIONS if fw["version"] == ver), None)
    # Deliberately-corrupted downloads ("-faulty") upload fine but are refused
    # at the gate: the platform flags the image as incompatible.
    if entry.get("is_faulty"):
        raise HTTPException(status_code=422, detail="Firmware not compatible: image failed verification (sha mismatch / corrupt header)")
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

@app.delete("/api/firmware/{version}")
async def delete_firmware(version: str):
    """Remove a firmware from the repository (and its binaries from disk)."""
    global FIRMWARE_VERSIONS
    in_use = [d["id"] for d in devices.values() if d["firmware"] == version]
    pending = [d["id"] for d in devices.values() if d.get("ota_pending") == version]
    if in_use or pending:
        who = ", ".join(in_use + pending)
        raise HTTPException(status_code=409, detail=f"Cannot delete — in use by {who}")
    if not any(fw["version"] == version for fw in FIRMWARE_VERSIONS):
        raise HTTPException(status_code=404, detail="Firmware not found")
    FIRMWARE_VERSIONS = [fw for fw in FIRMWARE_VERSIONS if fw["version"] != version]
    FIRMWARE_CODE.pop(version, None)
    for ext in (".bin", ".cpp"):
        p = os.path.join(os.path.dirname(__file__), "firmware", f"{version}{ext}")
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass
    await manager.broadcast("firmware_added", version, {"deleted": True, "version": version})
    return {"deleted": version}

@app.get("/api/firmware/{version}/download")
async def download_firmware(version: str):
    """Download a firmware source file (for offline demo uploads). Faulty
    samples are downloadable too — that's the point: upload one and watch the
    platform reject it."""
    code = FIRMWARE_CODE.get(version)
    if code is None:
        for p in PREDEFINED_FIRMWARE.values():
            if p["version"] == version:
                code = p["code"]
                break
    if code is None:
        fw = next((fw for fw in FIRMWARE_VERSIONS if fw["version"] == version), None)
        code = f"// Firmware {version}\n// Binary image (source not indexed)\n" if fw else None
    if code is None:
        raise HTTPException(status_code=404, detail="Firmware not found")
    faulty = "faulty" in version.lower()
    if faulty:
        code = (
            f"// ⚠ CORRUPTED BUILD — DO NOT FLASH\n// {version}: sha mismatch / truncated image\n"
            + code
        )
    filename = f"{version}{'-faulty' if faulty and 'faulty' not in version else ''}.cpp"
    return Response(
        content=code,
        media_type="text/x-csrc",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )

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
    # Uploaded/edited source wins, then the predefined library — the simulator
    # code viewer must show the sketch actually running on the device.
    if version in FIRMWARE_CODE:
        return {"version": version, "code": FIRMWARE_CODE[version]}
    for p in PREDEFINED_FIRMWARE.values():
        if p["version"] == version:
            return {"version": version, "code": p["code"]}
    return {"version": version, "code": "// Custom uploaded firmware binary - source not indexed\n"}

# Device Update (Metadata, Name, Group, Heartbeat)
@app.api_route("/api/devices/{device_id}", methods=["PATCH", "PUT"])
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
            dv = devices[did]
            dv["ota_pending"] = data.version
            dv["ota_progress"] = 0
            if not dv.get("online"):
                # Device is powered off — it cannot poll right now. Mark the
                # push as failed/retrying until it comes back.
                dv["ota_state"] = "failed"
                log_entry = {
                    "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                    "level": "WARN",
                    "msg": f"Update failed — device offline. Retrying every {OTA_RETRY_S}s…",
                    "device_id": did,
                }
                logs[did].append(log_entry)
                await manager.broadcast("device_log", did, log_entry)
            await manager.broadcast("ota_started", did, {
                "from_version": dv["firmware"],
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
        dv = devices[did]
        dv["ota_pending"] = data.version
        dv["ota_progress"] = 0
        if not dv.get("online"):
            dv["ota_state"] = "failed"
            log_entry = {
                "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                "level": "WARN",
                "msg": f"Update failed — device offline. Retrying every {OTA_RETRY_S}s…",
                "device_id": did,
            }
            logs[did].append(log_entry)
            await manager.broadcast("device_log", did, log_entry)
        await manager.broadcast("ota_started", did, {
            "from_version": dv["firmware"],
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
    # CRITICAL: every response here must be no-store. Without it, browsers
    # heuristically cache the 200 firmware payload (FileResponse sends
    # Last-Modified but no Cache-Control) and REPLAY it on later polls —
    # the device then sees "update available" forever and flash-loops.
    no_store = {"Cache-Control": "no-store"}
    if d.get("ota_pending"):
        version = d["ota_pending"]
        fw_path = os.path.join(os.path.dirname(__file__), "firmware", f"{version}.bin")
        if os.path.exists(fw_path):
            return FileResponse(fw_path, media_type="application/octet-stream",
                                headers={"X-Firmware-Version": version, **no_store})
        # No binary on disk — still tell the device to update (headers only)
        return JSONResponse({"status": "update_available", "version": version}, headers=no_store)
    # No update pending
    return Response(status_code=304, headers=no_store)

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
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
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
        # Handshake: announce this client so it learns its own API base as seen
        # by the backend (lets remote devices hit the right host).
        client_host = websocket.headers.get("host", "localhost:8000")
        await websocket.send_text(json.dumps({
            "type": "hello",
            "device_id": "",
            "payload": {"server_host": client_host},
        }))
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


# ─── Static files & Single-Service SPA Routing (Render Deployment) ────────────

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASHBOARD_DIST = os.path.join(BASE_DIR, "dashboard", "dist")
SIMULATOR_DIST = os.path.join(BASE_DIR, "simulator", "dist")

# Mount static asset folders if they exist
sim_assets = os.path.join(SIMULATOR_DIST, "assets")
if os.path.isdir(sim_assets):
    app.mount("/simulator/assets", StaticFiles(directory=sim_assets), name="simulator-assets")

dash_assets = os.path.join(DASHBOARD_DIST, "assets")
if os.path.isdir(dash_assets):
    app.mount("/assets", StaticFiles(directory=dash_assets), name="dashboard-assets")


@app.get("/simulator", include_in_schema=False)
@app.get("/simulator/", include_in_schema=False)
@app.get("/simulator/{full_path:path}", include_in_schema=False)
async def serve_simulator_spa(full_path: str = ""):
    """Serves the PC-B ESP32 Simulator single-page application and its assets."""
    if os.path.exists(SIMULATOR_DIST):
        target = os.path.join(SIMULATOR_DIST, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        index_file = os.path.join(SIMULATOR_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
    return JSONResponse(
        {"detail": "Simulator frontend not built yet. Run 'npm run build' in simulator/ directory."},
        status_code=404,
    )


@app.get("/", include_in_schema=False)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_dashboard_spa(full_path: str = ""):
    """Serves the PC-A Fleet Dashboard single-page application and its assets."""
    # Never intercept API, OTA, or WebSocket endpoints
    if full_path.startswith("api/") or full_path.startswith("ota/") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    if os.path.exists(DASHBOARD_DIST):
        target = os.path.join(DASHBOARD_DIST, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        index_file = os.path.join(DASHBOARD_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
    return JSONResponse({
        "status": "online",
        "service": "IoT OTA Dashboard Backend",
        "detail": "Frontend dist folders not built yet. Run 'npm run build' in dashboard/ and simulator/.",
    })
