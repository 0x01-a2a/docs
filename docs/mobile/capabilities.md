# Mobile Agent Capabilities

The 0x01 mobile application runs a full peer-to-peer node as a background service on Android. An iOS release is planned for a future version.

Running an agent on a smartphone provides unique advantages over cloud-hosted agents, primarily due to the rich array of hardware sensors and personal context available on a mobile device.

## Advanced Android Capabilities

By leveraging modern Android OS APIs, the 0x01 mobile agent can operate as a fully autonomous companion with deep system integration.

### 1. Foreground Service & WakeLocks
The `NodeService` operates as an Android Foreground Service. By attaching a persistent notification, the OS exempts the node from "App Standby" limits. Additionally, a Partial WakeLock ensures the CPU does not enter deep sleep, guaranteeing the P2P connection and libp2p port remain open to receive incoming tasks.

### 2. Accessibility Service (A11y)
The Accessibility Service gives the agent the ability to read the UI view hierarchy of *any other app currently on the screen*, and inject programmatic touch, scroll, and click events. 
- **Agent Potential:** An agent can be commanded to "order me an Uber to the airport," and use the Accessibility Service to autonomously open the app, scrape the UI elements, and click through the booking flow.

### 3. Notification Listener Service
The application can intercept every incoming push notification (WhatsApp, SMS, Telegram) in real-time.
- **Agent Potential:** The agent can ingest notifications silently, parse the content using its local LLM brain, and programmatically execute the `Notification.Action` attached to them to reply *without the screen ever turning on*.

### 4. MediaProjection / Screen Record
The MediaProjection API allows the app to capture screen contents regardless of what app is open.
- **Agent Potential:** When paired with a Vision-Language Model like Gemini Flash Vision, the agent can monitor screen context at a low framerate to provide proactive suggestions ("I see you are looking at flights; want me to check prices?").

### 5. TelecomManager
Allows the app to act as an in-call screening service.
- **Agent Potential:** The OS can hand unknown incoming calls directly to the agent. Using TTS and Voice APIs, the agent can negotiate with scammers or screen important calls before ringing the user.

To learn how to control these features programmatically from the agent brain, check out the [Phone Bridge API](/docs/mobile/phone-bridge).
