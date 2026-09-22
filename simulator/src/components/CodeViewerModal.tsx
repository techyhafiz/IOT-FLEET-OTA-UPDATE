import React from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import type { Device } from '@shared/types'

const LED_SKETCH = (id: string, apiBase: string) => `#include <Arduino.h>
#include <WiFi.h>
#include <HTTPUpdate.h>

const char* ssid     = "Lab_WiFi";
const char* password = "your_password";
const char* ota_host = "${apiBase.replace('http://', '').split(':')[0]}";
const int   ota_port = 8000;
const char* device_id = "${id}";

#define LED1_PIN  D0   // GPIO 16
#define LED2_PIN  D1   // GPIO 17

WiFiClient client;

void setup() {
  Serial.begin(115200);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected! IP: " + WiFi.localIP().toString());

  checkOTA();  // Check for update on boot
}

void loop() {
  // Blink LED1 every 1 second (D0 HIGH → LED 1 ON)
  digitalWrite(LED1_PIN, HIGH);   // D0 HIGH 🟡
  delay(1000);
  digitalWrite(LED1_PIN, LOW);    // D0 LOW  ⚫
  delay(1000);

  checkOTA();  // Poll OTA server
}

void checkOTA() {
  String url = "/ota/update/" + String(device_id);
  t_httpUpdate_return ret = httpUpdate.update(client, ota_host, ota_port, url);

  switch (ret) {
    case HTTP_UPDATE_OK:
      Serial.println("OTA success — rebooting");
      ESP.restart();
      break;
    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("OTA check — no update");
      break;
    case HTTP_UPDATE_FAILED:
      Serial.printf("OTA failed: %s\\n", httpUpdate.getLastErrorString().c_str());
      break;
  }
}
`

const LCD_SKETCH = (id: string, apiBase: string) => `#include <Arduino.h>
#include <WiFi.h>
#include <HTTPUpdate.h>
#include <LiquidCrystal_I2C.h>

const char* ssid     = "Lab_WiFi";
const char* password = "your_password";
const char* ota_host = "${apiBase.replace('http://', '').split(':')[0]}";
const int   ota_port = 8000;
const char* device_id = "${id}";

// 16x2 LCD via I2C (address 0x27)
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClient client;

void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected!");

  lcd.setCursor(0, 0);
  lcd.print("Hello World!    ");
  lcd.setCursor(0, 1);
  lcd.print("Sys: RUNNING    ");

  checkOTA();  // Check for update on boot
}

void loop() {
  // Rotate message every 5s
  delay(5000);
  lcd.setCursor(0, 0);
  lcd.print("OTA System      ");
  lcd.setCursor(0, 1);
  lcd.print("v1.2.0 Ready    ");

  checkOTA();
}

void checkOTA() {
  String url = "/ota/update/" + String(device_id);
  t_httpUpdate_return ret = httpUpdate.update(client, ota_host, ota_port, url);

  if (ret == HTTP_UPDATE_OK) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Flashing OTA...");
    ESP.restart();
  }
}
`

interface Props {
  device: Device
  onClose: () => void
}

export function CodeViewerModal({ device, onClose }: Props) {
  const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
  const code = device.template === 'lcd'
    ? LCD_SKETCH(device.id, apiBase)
    : LED_SKETCH(device.id, apiBase)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-cyan-700 font-mono">
              📄 {device.id} — Arduino Sketch
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Template: {device.template === 'lcd' ? '16×2 LCD Display' : '2-LED Controller'} · Read-only
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>

        {/* Code */}
        <div className="overflow-y-auto flex-1 rounded-b-none bg-slate-50">
          <SyntaxHighlighter
            language="cpp"
            style={atomOneLight}
            showLineNumbers
            customStyle={{
              margin: 0,
              background: '#f8fafc',
              fontSize: '12px',
              lineHeight: '1.6',
              borderRadius: 0,
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl shrink-0">
          <p className="text-xs text-slate-600 font-mono text-center font-medium">
            💡 This is the exact code this device would run on real ESP32 hardware.
            The simulator mirrors its GPIO behavior and OTA polling faithfully.
          </p>
        </div>
      </div>
    </div>
  )
}
