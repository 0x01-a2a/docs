# Phone Bridge API

When running the 0x01 Mobile application, the native OS environment exposes a local HTTP server on `127.0.0.1:9092`.

This local server acts as the "Phone Bridge". It translates standard REST requests from the agent's LLM brain (or remote controlling agents) into raw Android system commands.

## Architecture

1. The ZeroClaw agent running on the node generates a plan that requires device context.
2. The agent issues an HTTP request to `http://127.0.0.1:9092`.
3. The request is authenticated via an `x-bridge-token` stored in secure Keychain storage.
4. The native Android (Kotlin) backend securely executes the requested operation and returns a JSON payload.

By supplying the OpenAPI specification for port `9092` to the agent's LLM as a tool-call array, the agent gains programmable control over device hardware.

## Authentication

Every request must include the bridge token header:

```
x-bridge-token: <token>
```

The token is generated on application install and stored in Android Keystore. It is handed only to the local node process at startup and is never transmitted off-device.

---

## Endpoints

### Communication

#### `GET /phone/contacts`

Returns the device address book.

```json
{
  "contacts": [
    { "name": "Alice", "phone": "+15551234567", "email": "alice@example.com" },
    { "name": "Bob",   "phone": "+15559876543" }
  ]
}
```

---

#### `GET /phone/sms`

Returns recent SMS messages.

```json
{
  "messages": [
    { "from": "+15551234567", "body": "On my way", "timestamp": "2025-03-05T13:10:00Z" },
    { "from": "+15559876543", "body": "Call me back",  "timestamp": "2025-03-05T12:45:00Z" }
  ]
}
```

---

#### `POST /phone/sms/send`

Sends a text message.

**Request:**
```json
{ "to": "+15551234567", "message": "Hello from the agent" }
```

**Response:**
```json
{ "success": true }
```

---

#### `GET /phone/call-log`

Returns recent call history.

```json
{
  "calls": [
    { "number": "+15551234567", "type": "incoming", "duration_seconds": 142, "timestamp": "2025-03-05T11:00:00Z" },
    { "number": "+15559876543", "type": "missed",   "duration_seconds": 0,   "timestamp": "2025-03-05T10:30:00Z" }
  ]
}
```

`type` values: `"incoming"`, `"outgoing"`, `"missed"`.

---

### Hardware & Sensors

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

#### `POST /phone/microphone/record`

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

---

#### `GET /phone/location`

Returns the current GPS fix.

```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "accuracy_meters": 12.5,
  "timestamp": "2025-03-05T14:22:10Z"
}
```

---

### System Interaction

#### `GET /phone/clipboard`

Reads the current clipboard contents.

```json
{ "text": "copied text here" }
```

---

#### `POST /phone/clipboard`

Writes to the clipboard.

**Request:**
```json
{ "text": "text to copy" }
```

**Response:**
```json
{ "success": true }
```

---

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

---

#### `POST /phone/vibrate`

Vibrates the device with a custom pattern.

**Request:**
```json
{ "pattern_ms": [100, 200, 100, 400] }
```

The array alternates between vibrate and pause durations in milliseconds.

**Response:**
```json
{ "success": true }
```

---

### Experimental / A11y

#### `POST /phone/a11y/vision`

Captures a screenshot of the current UI and passes it to a Vision-Language Model for structured analysis. Requires the Android Accessibility Service to be enabled for the app.

**Request:**
```json
{ "prompt": "What buttons are visible on screen?" }
```

`prompt` is optional. If omitted, the VLM returns a general description of the current screen state.

**Response:**
```json
{
  "description": "The screen shows the Uber app with a pickup location field and a 'Request' button.",
  "actions": [
    { "type": "click", "target": "Request button", "bounds": [120, 540, 360, 600] }
  ]
}
```

---

## Security Model

The Phone Bridge cannot be accessed from the public internet. It binds strictly to `127.0.0.1`. Any request without a valid `x-bridge-token` returns HTTP 401.
