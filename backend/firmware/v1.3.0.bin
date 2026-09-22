#include <WiFi.h>
#include <HTTPClient.h>

// Sensor Telemetry & Power Management v1.3.0
const char* ssid = "Fleet_IoT_Mesh";
const char* pass = "SecretPass123";
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }
  Serial.println("[OTA v1.3.0] Telemetry Node Verified & Online.");
}

void loop() {
  int val = analogRead(SENSOR_PIN);
  Serial.printf("[SENSOR] ADC Value: %d\n", val);
  delay(2000);
}
