# Smart Heating Architecture (Draft)

## Goal
Provide a stable JSON-based integration between the web platform and ESP32 controllers for Smart Heating (Premium + IoT), while keeping UI and device logic decoupled.

## Core Components

### Frontend
- Smart Heating dashboard UI (template used for demo and live).
- Slider controls for curve and min external temperature.
- REST calls for settings and device status.

### Backend (Django)
- `iot_heating` app with REST endpoints under `/api/iot/`.
- Data models:
  - `HeatingDevice`: physical controller (ESP32, Shelly, etc.).
  - `HeatingSession`: on/off sessions for billing and analytics.
  - `TelemetryLog`: raw JSON telemetry for debug/history.
  - `HeatingControlProfile`: per-building control settings.

### Device (ESP32)
- Polls server for config via JSON.
- Reports telemetry and state changes via JSON.

## Data Model Summary

### HeatingDevice
- Identifies a physical controller via `device_id` and `api_key`.
- Tracks `current_status`, `last_seen`.

### HeatingControlProfile
- One profile per building.
- Fields:
  - `curve_value` (0-100)
  - `min_external_temp` (-30..30)
  - `schedule` (JSON list)

### HeatingSession
- Stores session start/end time; used for reports/analytics.

### TelemetryLog
- Stores raw JSON payloads from devices.

## API Endpoints

### User-authenticated
- `GET /api/iot/devices/`
  - List devices for the current user buildings.
- `POST /api/iot/devices/<id>/report_status/`
  - Manual device state report (used by UI or test clients).
- `GET /api/iot/buildings/<building_id>/settings/`
  - Read control profile for a building.
- `PATCH /api/iot/buildings/<building_id>/settings/`
  - Update control profile (curve, min external temp, schedule).

### Device-authenticated
- `GET /api/iot/device/<device_id>/sync/`
  - Return config JSON for the device.
- `POST /api/iot/device/<device_id>/sync/`
  - Send telemetry/state; returns config JSON.

## Device Sync JSON

### Response (config)
```json
{
  "config": {
    "protocol_version": 1,
    "device_id": "ESP32-001",
    "building_id": 12,
    "iot_enabled": true,
    "curve": {
      "value": 60,
      "min_external_temp": 8
    },
    "schedule": [
      {
        "day": "Mon-Fri",
        "slots": ["06:30-09:30", "18:00-23:00"],
        "target": "22C",
        "mode": "Auto"
      }
    ],
    "updated_at": "2025-12-29T10:45:00Z",
    "server_time": "2025-12-29T10:46:12Z"
  }
}
```

### Request (telemetry)
```json
{
  "state": "on",
  "temp_out": 8.7,
  "supply_temp": 61.5,
  "voltage": 3.3,
  "errors": []
}
```

## Schedule JSON Schema (Draft)
Each entry in `schedule` is a plain object with:
- `day`: string (`Mon-Fri`, `Sat`, `Sun`, etc.)
- `slots`: array of time ranges (`HH:MM-HH:MM`)
- `target`: target temperature (string or number)
- `mode`: `Auto` | `Eco` | `Manual`

## Security
- Devices authenticate using `X-Device-Key`, `Authorization: Bearer`, or `api_key` query param.
- User endpoints are gated by Premium + IoT entitlements.

## Frontend Integration
- Sliders update `curve_value` and `min_external_temp` via PATCH.
- Devices pick up changes on the next sync call.

## Roadmap (Planned)
1. **Settings Persistence**
   - Current: slider changes PATCH the building profile.
2. **Schedule Editor**
   - UI to edit weekly schedule and send JSON to backend.
3. **Telemetry Aggregation**
   - Daily/weekly stats for charts and cost estimation.
4. **Command Queue**
   - Optional command queue for immediate actions (force ON/OFF).
5. **Protocol Versioning**
   - Expand `protocol_version` to support backward compatible updates.
6. **Device Provisioning**
   - Admin workflow to register device + rotate keys.

## Operational Notes
- Device sync can be called every 30-60 seconds.
- Telemetry logs are stored raw; retention policy can be added later.
- All timestamps are in ISO8601.
