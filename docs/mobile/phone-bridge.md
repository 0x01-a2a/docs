# Phone Bridge API

When running the 0x01 Mobile application, the native OS environment exposes a local HTTP server on `127.0.0.1:9092`.

This local server acts as the "Phone Bridge". It translates standard REST requests from the agent's LLM brain (or remote controlling agents) into Android system commands.

## Architecture

1. The ZeroClaw agent generates a plan that requires device context.
2. The agent issues an HTTP request to `http://127.0.0.1:9092`.
3. The request is authenticated via an `x-bridge-token` stored in Android Keystore.
4. The native Kotlin backend executes the requested operation and returns a JSON payload.

By supplying the OpenAPI specification for port `9092` to the agent's LLM as a tool-call array, the agent gains programmable access to device hardware and personal data.

## Authentication

Every request must include the bridge token header:

```
x-bridge-token: <token>
```

The token is generated on application install and stored in Android Keystore. It is handed only to the local node process at startup and is never transmitted off-device. Any request without a valid token returns HTTP 401.

## Capability Gating

Each endpoint is gated by a named capability that can be toggled individually in **Settings → Phone Bridge**. If a capability is disabled, the endpoint returns HTTP 403 with `{"error": "capability disabled"}`. The capabilities are:

| Capability | Controls |
|---|---|
| `notifications_read` | Read active and historical notifications from all apps |
| `notifications_reply` | Reply to notifications inline (WhatsApp, Messages, etc.) |
| `notifications_dismiss` | Dismiss notifications |
| `sms_read` | Read SMS inbox |
| `sms_send` | Send SMS messages |
| `contacts` | Read/write address book |
| `location` | GPS location |
| `calendar` | Read/write calendar events |
| `media` | Photo library and documents |
| `motion` | IMU accelerometer/gyroscope data |
| `camera` | Headless camera capture |
| `microphone` | Audio recording |
| `calls` | Call log, pending calls, call screening |
| `health` | Health Connect data (steps, heart rate, sleep, calories) |
| `wearables` | BLE GATT wearable scan and read |
| `screen_read_tree` | Read UI view hierarchy of foreground app |
| `screen_capture` | Screenshot |
| `screen_act` | Inject touch/click/scroll/type into other apps |
| `screen_global_nav` | Trigger Back/Home/Recents |
| `screen_vision` | Send screenshot to Vision-Language Model |
| `screen_autonomy` | Multi-step autonomous screen sequences |

---

## Endpoints

### Contacts

#### `GET /phone/contacts`

Returns the device address book. Optional `?query=` for name search.

```json
{
  "contacts": [
    { "id": "12", "name": "Alice", "phone": "+15551234567" },
    { "id": "34", "name": "Bob",   "phone": "+15559876543" }
  ]
}
```

#### `POST /phone/contacts`

Creates a new contact.

**Request:**
```json
{ "name": "Alice", "phone": "+15551234567" }
```
**Response:**
```json
{ "raw_contact_id": 42 }
```

#### `PUT /phone/contacts/{id}`

Updates an existing contact by ID.

**Request:**
```json
{ "phone": "+15550001111" }
```
**Response:**
```json
{ "rows_updated": 1 }
```

---

### Messaging

SMS endpoints are gated by `sms_read` (read) and `sms_send` (send) separately.

#### `GET /phone/sms`

Returns recent SMS messages. Requires `sms_read`. Optional `?box=inbox|sent|all` (default `inbox`) and `?limit=`.

```json
{
  "messages": [
    { "from": "+15551234567", "body": "On my way", "timestamp": "2026-03-21T13:10:00Z" },
    { "from": "+15559876543", "body": "Call me back", "timestamp": "2026-03-21T12:45:00Z" }
  ]
}
```

#### `POST /phone/sms/send`

Sends a text message. Requires `sms_send`.

**Request:**
```json
{ "to": "+15551234567", "message": "Hello from the agent" }
```
**Response:**
```json
{ "success": true }
```

---

### Calls

#### `GET /phone/call_log`

Returns recent call history. Optional `?limit=`.

```json
{
  "calls": [
    { "number": "+15551234567", "type": "incoming", "duration_seconds": 142, "timestamp": "2026-03-21T11:00:00Z" },
    { "number": "+15559876543", "type": "missed",   "duration_seconds": 0,   "timestamp": "2026-03-21T10:30:00Z" }
  ]
}
```

`type` values: `"incoming"`, `"outgoing"`, `"missed"`.

#### `GET /phone/calls/pending`

Returns the current incoming call waiting for screening (if any).

#### `GET /phone/calls/history`

Returns call screening history log.

#### `POST /phone/calls/respond`

Responds to a pending screened call.

**Request:**
```json
{ "action": "answer" }
```

`action` values: `"answer"`, `"reject"`, `"silence"`.

---

### Location

#### `GET /phone/location`

Returns the current GPS fix.

```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "accuracy_meters": 12.5,
  "timestamp": "2026-03-21T14:22:10Z"
}
```

---

### Calendar

#### `GET /phone/calendar`

Returns calendar events. Optional `?start_ms=`, `?end_ms=`, `?limit=`.

```json
{
  "events": [
    { "id": "1", "title": "Team sync", "start": "2026-03-22T10:00:00Z", "end": "2026-03-22T11:00:00Z", "location": "Zoom" }
  ]
}
```

#### `POST /phone/calendar`

Creates a new calendar event.

**Request:**
```json
{ "title": "Meeting", "start_ms": 1742640000000, "end_ms": 1742643600000, "description": "Optional notes" }
```
**Response:**
```json
{ "event_id": "42" }
```

#### `PUT /phone/calendar/{id}`

Updates an existing event.

---

### Camera

#### `POST /phone/camera/capture`

Triggers a headless camera capture.

**Request:**
```json
{ "lens": "back" }
```

`lens` values: `"front"`, `"back"`.

**Response:**
```json
{
  "image_b64": "<base64-encoded JPEG>",
  "width": 1920,
  "height": 1080,
  "format": "jpeg"
}
```

---

### Audio

#### `POST /phone/audio/record`

Records audio for a fixed duration.

**Request:**
```json
{ "duration_seconds": 5 }
```

**Response:**
```json
{
  "audio_b64": "<base64-encoded WAV>",
  "format": "wav",
  "duration_seconds": 5
}
```

#### `GET /phone/audio/profile`

Returns the current audio environment profile (detected ambient noise level, active audio mode).

#### `POST /phone/audio/profile`

Sets audio mode preferences.

---

### Media

#### `GET /phone/media/images`

Lists photos from the device gallery, sorted newest first. Optional `?limit=` (max 50) and `?offset=`.

```json
[
  {
    "id": 1234,
    "uri": "content://media/external/images/media/1234",
    "name": "IMG_20260321.jpg",
    "date_taken": 1742600000000,
    "size_bytes": 3145728,
    "width": 4032,
    "height": 3024
  }
]
```

#### `GET /phone/documents`

Lists accessible documents from device storage. Optional `?mime_type=`, `?limit=`.

---

### Notifications

#### `GET /phone/notifications`

Returns currently visible notifications.

```json
{
  "notifications": [
    { "id": "1", "package": "com.whatsapp", "title": "Alice", "text": "On my way", "timestamp": 1742600000000 }
  ]
}
```

#### `GET /phone/notifications/history`

Returns the recent notification history ring buffer (last 200 entries).

#### `POST /phone/notifications/reply`

Sends a reply via a notification's inline reply action.

**Request:**
```json
{ "notification_key": "<key>", "reply_text": "Be there in 10" }
```

#### `POST /phone/notifications/dismiss`

Dismisses a notification.

**Request:**
```json
{ "notification_key": "<key>" }
```

---

### Health & Wearables

#### `GET /phone/health`

Returns health data from Android Health Connect. Optional `?types=steps,heart_rate,sleep,calories` and `?days=7` (max 90).

```json
{
  "steps": { "total": 8432, "days": [{ "date": "2026-03-21", "count": 8432 }] },
  "heart_rate": { "average_bpm": 72, "resting_bpm": 62 },
  "sleep": { "total_hours": 7.5 },
  "calories": { "total_kcal": 2100 }
}
```

#### `GET /phone/recovery`

Returns a computed recovery score (0–100) based on recent sleep, HRV, and resting heart rate.

```json
{ "score": 82, "label": "ready", "components": { "sleep": 85, "hrv": 78, "resting_hr": 83 } }
```

#### `GET /phone/wearables/scan`

Scans for BLE GATT wearables. Optional `?duration_ms=` (2000–15000, default 8000).

```json
{
  "devices": [
    { "address": "AA:BB:CC:DD:EE:FF", "name": "Polar H10", "rssi": -62 }
  ]
}
```

#### `GET /phone/wearables/read`

Reads a GATT characteristic from a paired wearable.

Query params: `?device=<MAC>`, `?service=heart_rate|battery|body_composition|running_speed_cadence|glucose|cgm`

---

### Device & System

#### `GET /phone/device`

Returns device hardware info.

```json
{
  "manufacturer": "Google",
  "model": "Pixel 9",
  "brand": "google",
  "android_version": "15",
  "sdk_int": 35,
  "screen_width": 1080,
  "screen_height": 2400,
  "locale": "en_US"
}
```

#### `GET /phone/battery`

Returns current battery state.

```json
{ "percent": 78, "status": "discharging", "source": "unplugged" }
```

`status` values: `"charging"`, `"discharging"`, `"full"`, `"not_charging"`.
`source` values: `"ac"`, `"usb"`, `"wireless"`, `"unplugged"`.

#### `GET /phone/network`

Returns active network state.

```json
{ "connected": true, "type": "wifi", "internet": true, "validated": true }
```

#### `GET /phone/wifi`

Returns detailed Wi-Fi info (requires ACCESS_FINE_LOCATION for SSID).

```json
{ "enabled": true, "ssid": "MyNetwork", "ip": "192.168.1.42", "rssi": -55, "link_speed": 433, "frequency": 5180 }
```

#### `GET /phone/carrier`

Returns cellular carrier and call state.

```json
{ "operator_name": "T-Mobile", "country_iso": "us", "roaming": false, "call_state": "idle" }
```

`call_state` values: `"idle"`, `"ringing"`, `"offhook"`.

#### `GET /phone/bluetooth`

Returns paired Bluetooth devices.

```json
{
  "enabled": true,
  "devices": [
    { "address": "AA:BB:CC:DD:EE:FF", "name": "Pixel Buds", "type": "le" }
  ]
}
```

#### `GET /phone/timezone`

Returns device timezone.

```json
{ "id": "America/New_York", "display_name": "EST", "offset_ms": -18000000, "dst_active": false }
```

#### `GET /phone/activity`

Returns the current physical activity state (requires ACTIVITY_RECOGNITION permission).

```json
{ "activity": "walking", "confidence": 90 }
```

#### `GET /phone/app_usage`

Returns foreground app usage stats. Optional `?hours=24` (max 168).

```json
{
  "usage": [
    { "package": "com.twitter.android", "total_ms": 3600000, "last_used_ms": 1742600000000 }
  ]
}
```

#### `GET /phone/permissions`

Returns the current grant status of all bridge-relevant permissions.

```json
{
  "READ_CONTACTS": true,
  "WRITE_CONTACTS": false,
  "READ_SMS": true,
  "SEND_SMS": false,
  "ACCESS_FINE_LOCATION": true,
  "CAMERA": true,
  "RECORD_AUDIO": false
}
```

---

### Motion (IMU)

#### `GET /phone/imu`

Takes a single accelerometer + gyroscope snapshot.

```json
{
  "timestamp_ms": 1742600000000,
  "accelerometer": { "x": 0.12, "y": 9.78, "z": 0.04, "unit": "m/s²" },
  "gyroscope":     { "x": 0.01, "y": -0.02, "z": 0.00, "unit": "rad/s" }
}
```

#### `POST /phone/imu/record`

Records a time-series IMU stream.

**Request:**
```json
{ "duration_ms": 5000, "rate_hz": 50 }
```

`duration_ms`: 500–30000. `rate_hz`: 10–200 (default 50).

**Response:**
```json
{
  "duration_ms": 5000,
  "rate_hz": 50,
  "sample_count": 250,
  "has_gyroscope": true,
  "accelerometer": [{ "t_ms": 0, "x": 0.12, "y": 9.78, "z": 0.04 }, "..."],
  "gyroscope":     [{ "t_ms": 0, "x": 0.01, "y": -0.02, "z": 0.00 }, "..."]
}
```

---

### System Interaction

#### `POST /phone/notify`

Posts a notification to the system tray.

**Request:**
```json
{ "title": "Agent Update", "body": "Your flight price dropped to $312." }
```
**Response:**
```json
{ "success": true }
```

#### `POST /phone/vibrate`

Vibrates the device.

**Request:**
```json
{ "duration_ms": 200, "amplitude": 128 }
```

`amplitude`: 1–255, or omit for device default.

**Response:**
```json
{ "vibrating": true, "duration_ms": 200 }
```

#### `POST /phone/clipboard`

Writes text to the clipboard.

**Request:**
```json
{ "text": "text to copy" }
```
**Response:**
```json
{ "success": true }
```

#### `POST /phone/alarm`

Sets a one-shot alarm.

**Request:**
```json
{ "trigger_ms": 1742643600000, "label": "Call Alice" }
```
**Response:**
```json
{ "success": true }
```

---

### Accessibility (Screen Control)

All `/phone/a11y/*` endpoints require the Accessibility Service to be enabled and the relevant `screen_*` capability to be on. Available in the `full` APK only. In ASSISTED mode these endpoints trigger a user confirmation bottom-sheet before executing.

#### `GET /phone/a11y/status`

Returns whether the accessibility service is currently connected.

```json
{ "connected": true }
```

#### `GET /phone/a11y/tree`

Returns the full UI view hierarchy of the foreground app. Requires `screen_read_tree`.

```json
{
  "nodes": [
    {
      "className": "android.widget.Button",
      "text": "Submit",
      "viewId": "com.example:id/btn_submit",
      "bounds": { "left": 120, "top": 540, "right": 360, "bottom": 600 },
      "clickable": true,
      "editable": false,
      "enabled": true
    }
  ]
}
```

#### `GET /phone/a11y/screenshot`

Captures a JPEG screenshot. Requires `screen_capture`. Requires Android 11+.

```json
{ "format": "jpeg", "data_base64": "<base64 JPEG>" }
```

#### `POST /phone/a11y/action`

Performs an accessibility action on a specific view node by ID. Requires `screen_act`.

**Request:**
```json
{ "viewId": "com.example:id/btn_submit", "action": "click" }
```

`action` values: `"click"`, `"long_click"`, `"focus"`, `"clear_focus"`, `"scroll_forward"`, `"scroll_backward"`, `"set_text"` (pass `"text"` field for set_text).

**Response:**
```json
{ "success": true }
```

#### `POST /phone/a11y/click`

Clicks at absolute screen coordinates. Requires `screen_act`.

**Request:**
```json
{ "x": 240, "y": 570 }
```
**Response:**
```json
{ "success": true }
```

#### `POST /phone/a11y/global`

Triggers a global navigation action. Requires `screen_global_nav`.

**Request:**
```json
{ "action": "back" }
```

`action` values: `"back"`, `"home"`, `"recents"`, `"notifications"`, `"quick_settings"`.

**Response:**
```json
{ "success": true }
```

#### `GET /phone/a11y/autonomy`

Returns the current accessibility tree (same as `/tree`). Used as a foundation step before beginning a multi-step autonomous sequence. Requires `screen_autonomy`.

#### `POST /phone/a11y/wait_for`

Waits up to `timeout_ms` for an element matching the selector to appear. Optionally taps it. Requires `screen_act`.

**Request:**
```json
{
  "view_id":      "com.example:id/btn_ok",
  "text":         "Submit",
  "content_desc": "close button",
  "class_name":   "android.widget.Button",
  "exact_text":   false,
  "timeout_ms":   5000,
  "tap":          false
}
```

At least one of `view_id`, `text`, `content_desc`, or `class_name` is required. All fields are optional individually.

**Response:**
```json
{ "found": true, "tapped": false, "node": { "text": "Submit", "viewId": "...", "bounds": {...} } }
```

#### `POST /phone/a11y/scroll_find`

Scrolls a container until the target element appears, then optionally taps it. Requires `screen_act`.

**Request:**
```json
{
  "text":              "Settings",
  "direction":         "down",
  "max_scrolls":       10,
  "container_view_id": "com.example:id/list",
  "wait_after_ms":     400,
  "tap":               true
}
```

`direction` values: `"up"`, `"down"`, `"left"`, `"right"` (default `"down"`).

**Response:**
```json
{ "found": true, "tapped": true }
```

#### `POST /phone/a11y/tap_text`

Finds the first element whose text matches and clicks it. Requires `screen_act`.

**Request:**
```json
{ "text": "Submit", "exact": false, "timeout_ms": 3000 }
```
**Response:**
```json
{ "success": true }
```

#### `POST /phone/a11y/type`

Types text into a field. Without `view_id`, targets the focused or first editable field. Requires `screen_act`.

**Request:**
```json
{ "text": "hello world", "view_id": "com.example:id/input" }
```
**Response:**
```json
{ "success": true }
```

#### `POST /phone/a11y/swipe`

Performs a swipe gesture between two screen coordinates. Requires `screen_act`.

**Request:**
```json
{ "x1": 300, "y1": 800, "x2": 300, "y2": 200, "duration_ms": 300 }
```
**Response:**
```json
{ "success": true }
```

#### `GET /phone/a11y/tree_interactive`

Returns a filtered UI tree containing only interactive elements (clickable, long-clickable, or editable). Lighter payload than `/phone/a11y/tree`. Requires `screen_read_tree`. Optional `?class_filter=Button,EditText` to further narrow by class name.

```json
{
  "nodes": [
    { "className": "android.widget.Button", "text": "Submit", "viewId": "...", "bounds": {...}, "clickable": true }
  ]
}
```

#### `POST /phone/a11y/execute_plan`

Executes a multi-step UI automation plan in a single request. Each step is an action applied to an element identified by `view_id`, `text`, or screen coordinates. Requires `screen_act` and `screen_autonomy`.

**Request:**
```json
{
  "steps": [
    { "action": "tap_text",   "text": "Search" },
    { "action": "type",       "view_id": "com.example:id/search_input", "text": "0x01 agent" },
    { "action": "click",      "x": 900, "y": 120 },
    { "action": "wait_for",   "text": "Results", "timeout_ms": 4000 }
  ]
}
```

**Response:**
```json
{ "success": true, "steps_executed": 4 }
```

Step `action` values: `"tap_text"`, `"type"`, `"click"`, `"long_click"`, `"scroll_find"`, `"wait_for"`, `"global"`, `"swipe"`.

---

### Apps

#### `POST /phone/app/launch`

Launches an installed app by package name. Requires `screen_act`.

**Request:**
```json
{ "package": "com.twitter.android" }
```
**Response:**
```json
{ "success": true }
```

#### `GET /phone/app/list`

Lists installed non-system apps. Returns package name and label.

```json
[
  { "package": "com.twitter.android", "label": "X" },
  { "package": "com.whatsapp",        "label": "WhatsApp" }
]
```

---

### Notifications (continued)

#### `GET /phone/notifications/triage`

Returns all currently visible notifications grouped by priority (urgent, normal, silent). Requires `notifications_read`.

#### `POST /phone/notifications/triage`

Posts a triage decision for a set of notifications — mark as read, snooze, or dismiss. Requires `notifications_dismiss`.

---

### Device Context

#### `GET /phone/context`

Returns an aggregated snapshot of device state — battery, network, current foreground app, active notifications count, pending calls, and next calendar event. Useful as a single call to orient the agent before it acts.

```json
{
  "battery": { "percent": 78, "status": "discharging" },
  "network": { "connected": true, "type": "wifi" },
  "foreground_app": "com.twitter.android",
  "notifications_count": 3,
  "pending_calls": 0,
  "next_event": { "title": "Team sync", "start": "2026-03-22T10:00:00Z" }
}
```

#### `POST /phone/a11y/vision`

Captures a screenshot, optionally includes the UI tree, and sends both to a Vision-Language Model for analysis. Returns structured action suggestions. Requires `screen_vision`. Rate limited to 1 call per 3 seconds.

The VLM used is determined by the agent brain's configured provider (Gemini, Anthropic, or any OpenAI-compatible endpoint). No separate vision API key is needed — the same key from the Agent Brain config is used.

**Request:**
```json
{ "prompt": "What buttons are visible on screen?", "include_tree": false }
```

**Response:**
```json
{
  "description": "The screen shows the Uber app with a pickup location field and a 'Request' button.",
  "actions": [
    { "type": "click", "target": "Request button", "bounds": { "left": 120, "top": 540, "right": 360, "bottom": 600 } }
  ]
}
```

---

### Diagnostics

#### `GET /phone/activity_log`

Returns the bridge activity ring buffer (last 200 entries). Shows what actions the agent has taken recently. Optional `?limit=`.

```json
{
  "entries": [
    { "ts": 1742600000000, "endpoint": "POST /phone/a11y/tap_text", "cap": "screen_act", "status": 200 }
  ]
}
```

---

## Security Model

- The Phone Bridge binds strictly to `127.0.0.1` and cannot be accessed from the public internet.
- Every request requires a valid `x-bridge-token` (HTTP 401 otherwise).
- Each endpoint checks the corresponding capability toggle (HTTP 403 if disabled).
- In ASSISTED mode, screen-control endpoints present a user confirmation bottom-sheet before executing; the request blocks until approved or denied.
- The bridge activity log at `/phone/activity_log` gives the user full visibility into what the agent has done.
