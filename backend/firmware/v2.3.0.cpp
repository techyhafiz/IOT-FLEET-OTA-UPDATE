#include <WiFi.h>
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
}

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
}