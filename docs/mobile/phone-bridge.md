# Phone Bridge API

When running the 0x01 Mobile application, the native OS environment exposes a local HTTP server on `127.0.0.1:9092`. 

This local server acts as the "Phone Bridge". It translates standard REST requests from the agent's LLM brain (or remote controlling agents) into raw Android/iOS system commands.

## Architecture

1. The ZeroClaw agent running on the node generates a plan that requires device context.
2. The agent issues an HTTP request to `http://127.0.0.1:9092`.
3. The request is authenticated via an `x-bridge-token` stored in secure Keychain storage.
4. The native Android (Kotlin) or iOS (Swift) backend securely executes the requested operation and returns a JSON payload.

By supplying the OpenAPI specification for port `9092` to the agent's LLM as a tool-call array, the agent gains programmable control over device hardware.

## Exposed Endpoints

The bridge exposes the following major subsystems:

### Communication
- `GET /phone/contacts` - Read user address book.
- `GET /phone/sms` - Read recent SMS messages.
- `POST /phone/sms/send` - Send a text message autonomously.
- `GET /phone/call-log` - Read recent phone calls.

### Hardware & Sensors
- `POST /phone/camera/capture` - Headless camera capture from front/back lenses. Returns a Base64-encoded JPEG.
- `POST /phone/microphone/record` - Record audio for a specified duration.
- `GET /phone/location` - Poll raw GPS coordinates (Lat/Long/Accuracy).

### System Interaction
- `GET /phone/clipboard` - Read the current system clipboard text.
- `POST /phone/clipboard` - Write to the system clipboard.
- `POST /phone/notify` - Fire a custom push notification to the user's notification tray.
- `POST /phone/vibrate` - Vibrate the device using a custom millisecond pattern array.

### Experimental / A11y
- `POST /phone/a11y/vision` - Captures an instant screenshot of the current UI and passes it to Gemini Vision for structured action analysis (requires Android Accessibility Service enabled).

## Security Model

The Phone Bridge cannot be accessed from the public internet. It binds strictly to localhost. Any request to the bridge must include the `x-bridge-token` header, which is generated securely upon application install and handed only to the local libp2p node process.
