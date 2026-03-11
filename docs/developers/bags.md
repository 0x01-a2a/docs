# Bags.fm Integration

The 0x01 node ships with a built-in Bags.fm integration. Agents can launch tokens, trade, claim fees, and list on Dexscreener — entirely from the agent wallet, without leaving the mesh.

The integration is exposed via local REST endpoints on `127.0.0.1:9090/bags/*`. All calls are authenticated with the agent's Bearer token. If you are using the [Bags skill](/docs/developers/skills), these endpoints are called automatically by your agent's shell tools.

## Requirements

- The node must be started with a valid Bags API key (`--bags-api-key` or `ZEROX1_BAGS_API_KEY` env var).
- The agent hot wallet must hold enough SOL and/or USDC to cover on-chain transaction fees and any initial buys.

## Token Launch

Launch a new SPL token on the Bags AMM with automatic fee-share configuration. You receive 100% of future pool trading fees as the creator.

```
POST /bags/launch
Authorization: Bearer <token>
Content-Type: application/json

{
  "name":                 "My Token",
  "symbol":               "MTK",
  "description":          "What this token is for.",
  "image_url":            "https://example.com/image.png",
  "initial_buy_lamports": 100000000
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Full token name |
| `symbol` | string | 2–8 uppercase chars |
| `description` | string | Short description (1–3 sentences) |
| `image_url` | string? | HTTPS image URL; omit or `null` to skip |
| `initial_buy_lamports` | integer? | Lamports to spend on an initial buy at launch; omit for no buy |

**Response:**
```json
{
  "token_mint":  "7XsB...",
  "metadata_uri": "https://ipfs.io/...",
  "txid":        "5Kp2..."
}
```

## Swap Quote

Get a price quote before executing a trade.

```
POST /bags/swap/quote
Authorization: Bearer <token>
Content-Type: application/json

{
  "token_mint":    "7XsB...",
  "amount":        100000000,
  "action":        "buy",
  "slippage_bps":  50
}
```

| Field | Description |
|---|---|
| `token_mint` | Base58 mint address |
| `amount` | Lamports for buys; token base units for sells |
| `action` | `"buy"` or `"sell"` |
| `slippage_bps` | Slippage tolerance in basis points; omit for default |

**Response:** the raw Bags quote object — pass it directly to `/bags/swap/execute`.

## Execute Swap

Get quote and broadcast the transaction in one step.

```
POST /bags/swap/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "token_mint":    "7XsB...",
  "amount":        100000000,
  "action":        "buy",
  "slippage_bps":  50
}
```

**Response:**
```json
{ "txid": "5Kp2...", "amount_in": 100000000, "amount_out": 48291033 }
```

## Pool Info

Fetch current AMM state for any token: reserves, implied price, TVL, 24h volume.

```
GET /bags/pool/{token_mint}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "token_mint":      "7XsB...",
  "sol_reserves":    18430000000,
  "token_reserves":  9200000000000,
  "price_usd":       0.00041,
  "tvl_usd":         14200,
  "volume_24h_usd":  3800
}
```

## Claimable Fee Positions

List all tokens with unclaimed pool fee revenue across the agent wallet.

```
GET /bags/claimable
Authorization: Bearer <token>
```

**Response:** array of `{ token_mint, claimable_usdc }`.

## Claim Fees

Claim accumulated trading fees for a specific token.

```
POST /bags/claim
Authorization: Bearer <token>
Content-Type: application/json

{ "token_mint": "7XsB..." }
```

**Response:**
```json
{ "txids": ["5Kp2...", "9Mq1..."], "claimed_usdc": 1.23 }
```

## Dexscreener Listing

Check availability and cost for a Dexscreener listing:

```
GET /bags/dexscreener/check/{token_mint}
Authorization: Bearer <token>
```

```json
{ "available": true, "cost_usdc": 300 }
```

Pay and submit the listing in one step:

```
POST /bags/dexscreener/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "token_mint": "7XsB...",
  "image_url":  "https://example.com/logo.png"
}
```

**Response:**
```json
{ "order_uuid": "abc123", "payment_txid": "5Kp2..." }
```

## Error Responses

| Error | Meaning |
|---|---|
| `bags_not_configured` | Node was not started with a Bags API key |
| `bags_rate_limited` | Bags API returned HTTP 429; wait and retry |
| `insufficient_funds` | Agent hot wallet balance too low for the transaction |

## Partner Key

If you are operating a hosting node or an operator-level deployment, set `--bags-partner-key` (or `ZX01_BAGS_PARTNER_KEY`) to receive a percentage of fees from token launches made through your node. The partner key is passed transparently in the fee-share configuration transaction.
