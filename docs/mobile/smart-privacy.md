# Phone Smart Layer — Privacy

When ZeroClaw accesses personal data from your phone, the **Phone Smart Layer** ensures that raw personal data never leaves your device. Only inferred, structured summaries are forwarded to the LLM provider.

## The Core Guarantee

> **Raw personal data never leaves your device.**

SMS bodies, contact names, call numbers, health metrics, GPS coordinates, and notification text are processed entirely inside the ZeroClaw binary running on your phone. Only the *inferred meaning* — structured labels, counts, and classifications — is forwarded to the LLM.

## Why This Matters

ZeroClaw can be configured to use any LLM provider: OpenAI, Anthropic, Mistral, a local Ollama instance, or a self-hosted endpoint. Without the smart layer, asking the agent "what bills do I have this week?" would require sending your entire SMS inbox to that provider verbatim.

With the smart layer, the same question is answered by sending:

```json
{
  "bills": [{ "amount": "$1,400", "due": "March 31" }],
  "otp_codes_present": 2,
  "spam_filtered": 3,
  "replies_needed": [{ "urgency": "high", "has_bill": false }],
  "summary": "8 messages: 1 bill(s), 1 repl(ies) needed, 0 financial alert(s), 2 OTP(s), 3 spam"
}
```

No sender numbers. No message text. No contact names.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Phone                           │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │ PhoneBridgeServer│      │     ZeroClaw binary          │ │
│  │  (port 9092,     │      │                              │ │
│  │   loopback only) │◄─────│  phone_smart tools           │ │
│  │                  │      │  ┌──────────────────────────┐│ │
│  │  • SMS           │      │  │ 1. fetch raw data         ││ │
│  │  • Calendar      │      │  │    (loopback HTTP)        ││ │
│  │  • Notifications │      │  │ 2. run heuristics in Rust ││ │
│  │  • Health        │      │  │ 3. build structured       ││ │
│  │  • Location      │      │  │    summary                ││ │
│  │  • Call log      │      │  │ 4. discard raw data       ││ │
│  │  • Device/sensor │      │  └──────────────────────────┘│ │
│  └──────────────────┘      └──────────────┬───────────────┘ │
│                                           │                  │
└───────────────────────────────────────────┼──────────────────┘
                                            │ structured summary only
                                            ▼
                               ┌────────────────────────┐
                               │   External LLM API     │
                               │  (OpenAI / Anthropic / │
                               │   local Ollama / etc.) │
                               └────────────────────────┘
```

The bridge server is bound exclusively to `127.0.0.1:9092`. It is unreachable from the network. ZeroClaw communicates with it over loopback only, using a randomly-generated bearer token that is rotated on each app launch.

## What Each Tool Sends to the LLM

### Daily Brief (`phone_day_brief`)

| Data source | Raw data fetched | What reaches the LLM |
|---|---|---|
| Recovery | score (0-100), sleep duration, HRV, resting HR | score bucket (`"good"/"fair"/"poor"/"optimal"`), up to 2 insight strings with no raw numbers |
| SMS | full message bodies, sender numbers, timestamps | bill amounts + due-date hints, reply count, financial alert count — no body text, no numbers |
| Notifications | package names, title, full notification text | count by category (`financial`, `messaging`, etc.), urgent count — no text |
| Calendar | event titles, descriptions, start/end times | event count today, travel keyword detected (boolean), next free 1h block as time range |
| Device context | timezone offset, battery %, charge status, network type | timezone offset (used for time-of-day label only), battery label, network type label |
| Carrier | operator name, roaming flag, call state | `roaming: true/false` |

**Never sent:** sender phone numbers, message bodies, contact names, exact health numbers, full event titles or descriptions, exact battery %, GPS coordinates.

### SMS Brief (`phone_sms_brief`)

| Data source | Raw data fetched | What reaches the LLM |
|---|---|---|
| SMS | full message bodies, sender addresses, timestamps | bill list (amount + due hint), reply list (urgency label), financial alert list (amount + type), OTP count, spam count |

**Never sent:** message body text, sender phone numbers or names, exact timestamps.

OTP messages are counted but immediately discarded — their codes are never surfaced in any output field.

### Communications Summary (`phone_comms_summary`)

| Data source | Raw data fetched | What reaches the LLM |
|---|---|---|
| SMS | message bodies | urgent count, reply-needed count, bill count |
| Notifications | package names, notification text | counts by category, urgent count |
| Call log | numbers, call type, timestamps, duration | missed call count in last 24h |

**Never sent:** phone numbers, message bodies, notification text, contact names, call duration.

### Context Snapshot (`phone_context_now`)

| Data source | Raw data fetched | What reaches the LLM |
|---|---|---|
| Device context | battery %, charge status, network type, timezone offset, calendar events | battery label, connectivity label, in_meeting boolean, time-of-day label, weekend boolean |
| Carrier | roaming flag, call state | `location_type: "travel"/"local"` |
| Audio profile | DND mode, ringer mode, volume levels | DND mode label, ringer mode label |
| Activity | steps since reboot | `steps_available: true/false` |

**Never sent:** exact GPS coordinates (not fetched at all by this tool), exact battery percentage, network SSID, operator name, step count, volume levels.

## Data Retention

The smart tools are **stateless**. Each call:

1. Fetches data over loopback.
2. Processes it in Rust stack/heap memory.
3. Constructs the output JSON.
4. Returns — all intermediate data is dropped when the function returns.

Nothing is written to disk. Nothing is cached. No database entry is created. Raw fetched values are local variables that go out of scope and are freed by the allocator before the HTTP response to the LLM provider is even assembled.

## Classification Heuristics

All classification work happens inside the ZeroClaw binary using deterministic Rust code:

| Heuristic | How it works |
|---|---|
| OTP detection | Keyword match (`"code"`, `"otp"`, `"one-time"`, `"pin"`) + regex `\b\d{4,8}\b` |
| Spam detection | Keyword list (`"click here"`, `"free gift"`, `"lottery"`, etc.) |
| Bill detection | Amount regex (currency symbols + numeric pattern) + keyword match (`"due"`, `"invoice"`, `"bill"`, `"rent"`) |
| Urgency classification | Keyword tiers: `"overdue"/"final notice"/"action required"` → high; `"reminder"/"due soon"` → medium |
| Notification category | Android package name substring matching (`"whatsapp"` → messaging, `"coinbase"` → financial, etc.) |
| Recovery label | Score range: 0–39 → poor, 40–59 → fair, 60–79 → good, 80+ → optimal |
| Time of day | UTC offset from device + Unix timestamp → local hour → morning/afternoon/evening/night |

No machine learning. No on-device model. No network call. Pure deterministic Rust — auditable, reproducible, and fast (sub-millisecond per message).

## What Is Not Protected by This Layer

The smart layer is a privacy filter for **contextual data tools**. It does not cover:

- **Direct raw tools** — `phone_sms_read`, `phone_health_read`, `phone_notifications_get`, etc. If the LLM explicitly calls these, raw content is returned. The agent's system prompt and capability configuration control whether these are available.
- **Screen automation** — `phone_a11y_screenshot` and related tools operate on screen content. Their output is constrained by capability gating, not this layer.
- **The LLM provider's own privacy policy** — The structured summaries are sent to whatever provider the user configured. 0x01 cannot control what the provider does with the data it receives.

## Capability Gating

Every bridge endpoint is guarded by a capability flag in Android `SharedPreferences`. Capabilities can be toggled per-category in **Settings → Phone Bridge**:

| Capability | Controls |
|---|---|
| `messaging` | SMS read and send |
| `contacts` | Contacts read and write |
| `location` | GPS location |
| `camera` | Camera capture |
| `microphone` | Audio recording |
| `screen` | Accessibility tree and screen capture |
| `calls` | Call log and call screening |
| `calendar` | Calendar read and write |
| `media` | Photos and documents |

If a capability is disabled, the bridge returns `403 capability_disabled` and the smart tool treats that data source as absent — no error is surfaced to the LLM.

## Threat Model

| Threat | Mitigated by |
|---|---|
| LLM provider reads SMS bodies | Smart layer — bodies never leave device |
| LLM provider learns contact names | Smart layer — names never leave device |
| LLM provider learns exact health numbers | Smart layer — only score labels and insights are sent |
| LLM provider learns GPS coordinates | Smart layer — location is not fetched by smart tools; only roaming flag |
| Network attacker intercepts bridge traffic | Bridge binds to `127.0.0.1:9092` only; loopback is not routable |
| Malicious process reads bridge data | Bearer token required; token is random and rotated per app launch |
| Smart layer leaks raw data in error paths | All bridge calls return `Option` — failures produce absent fields, not raw data in errors |
