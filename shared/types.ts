export interface Device {
  id: string;
  mac: string;
  firmware: string;
  group: string;
  template: 'led' | 'lcd';
  online: boolean;
  uptime: number;
  gpio: { D0: 0 | 1; D1: 0 | 1; D2: 0 | 1; D3: 0 | 1 };
  lcd?: { row1: string; row2: string };
  temp?: string;
  heap?: string;
  rssi?: number;
  ip?: string;
  last_heartbeat?: string;
  ota_pending?: string | null;
  ota_progress?: number | null;
  /** OTA lifecycle state: 'failed' (offline, retrying) | 'incompatible' (cross-template bricked) */
  ota_state?: 'failed' | 'incompatible' | null;
  name?: string;
  heartbeat_rate?: number;
  /** External hardware chosen at add time (sim mode): LEDs wired on D0..D{n-1} */
  led_count?: number | null;
  /** Firmware-driven behaviour resolved on the backend (e.g. 'ip' / 'uptime') */
  fw_dynamic?: string | null;
  config?: Record<string, unknown>;
  registered_at: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  msg: string;
  device_id: string;
}

export interface FirmwareVersion {
  version: string;
  size: number;
  changelog: string;
  date: string;
  sha256?: string;
  is_faulty?: boolean;
  device_count?: number;
  filename?: string;
  has_source?: boolean;
}

export interface Group {
  name: string;
  device_count: number;
}

export interface OTAStatus {
  device_id: string;
  from_version: string;
  to_version: string;
  progress: number;
  state: 'pending' | 'downloading' | 'flashing' | 'complete' | 'error';
}

export type WSEventType =
  | 'device_registered'
  | 'device_removed'
  | 'device_status'
  | 'device_log'
  | 'ota_started'
  | 'ota_progress'
  | 'ota_complete'
  | 'config_pushed'
  | 'firmware_added'
  | 'ping';

export interface WSEvent {
  type: WSEventType;
  device_id: string;
  payload: unknown;
}

