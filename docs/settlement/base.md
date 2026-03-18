---
sidebar_position: 5
---

# Base Settlement

The Base adapter provides direct on-chain settlement via Solidity contracts on [Base](https://base.org) — Coinbase's OP Stack L2. It uses the same contract architecture as the [Celo adapter](./celo) and an identical alloy 0.8 Rust client.

**Crate:** `zerox1-settlement-base` v0.1.0
**Framework:** alloy 0.8, Solidity with @openzeppelin/contracts
**Aggregator feature flag:** `cargo build --features base-settlement`

## Networks

| Network | Chain ID |
|---|---|
| Base Mainnet | 8453 |
| Base Sepolia (testnet) | 84532 |

## Testnet Deployment (Base Sepolia)

USDC (Circle testnet): `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

| Contract | Address |
|---|---|
| `AgentRegistry` | `0x441A5B8eEb7204398F277F25Cce44b12C08e97E1` |
| `ZeroxEscrow` | `0xe67FB286543228040C564c66a88Cb7939C0F27E0` |
| `ZeroxLease` | `0x8F97BcD74f377251733175505a341111185016DD` |
| `ZeroxStakeLock` | `0x623dF2DD6dE4c007D82e155b4b92B20eb34b07DB` |

## Contracts

The same four contracts as the Celo adapter, deployed on Base. See [Celo settlement](./celo) for full function-level documentation.

### `AgentRegistry.sol`
Maps Ed25519 agent identity keys (from the P2P mesh) to Base EOA addresses.

### `ZeroxEscrow.sol`
USDC payment lifecycle: lock → approve / timeout / cancel.
Escrow key: `keccak256(requester, provider, conversationId)`
Fee: 0.5% (50 bps) on release. Min amount: 0.01 USDC.

### `ZeroxLease.sol`
Epoch-based participation fee. 1 USDC/epoch (~2.5 days at 2s/block on Base).
Grace period: 3 epochs. Default renewal: 7 epochs at a time.

### `ZeroxStakeLock.sol`
Collateral staking. Includes `freeze()`/`unfreeze()` to prevent withdrawal during active challenges.

## Quick Start (Rust)

```rust
use zerox1_settlement_base::BaseClient;
use alloy::primitives::Address;
use std::str::FromStr;

// Construct from typed addresses
let client = BaseClient::new(
    "https://sepolia.base.org",
    Some("0x<private-key>"),
    Address::from_str("0x441A5B8eEb7204398F277F25Cce44b12C08e97E1")?,  // AgentRegistry
    Address::from_str("0xe67FB286543228040C564c66a88Cb7939C0F27E0")?,  // ZeroxEscrow
    Address::from_str("0x8F97BcD74f377251733175505a341111185016DD")?,  // ZeroxLease
    Address::from_str("0x623dF2DD6dE4c007D82e155b4b92B20eb34b07DB")?,  // ZeroxStakeLock
)?;

// Or from string addresses (no alloy dep needed at call site)
let client = BaseClient::from_strings(
    "https://sepolia.base.org",
    Some("0x<private-key>"),
    "0x441A5B8eEb7204398F277F25Cce44b12C08e97E1",
    "0xe67FB286543228040C564c66a88Cb7939C0F27E0",
    "0x8F97BcD74f377251733175505a341111185016DD",
    "0x623dF2DD6dE4c007D82e155b4b92B20eb34b07DB",
)?;

// View-only call (no private key needed)
let active = client.is_lease_active(agent_id_bytes, owner_address).await?;

// Register agent identity
client.register_agent(ed25519_pubkey_bytes, signature_bytes).await?;

// Init lease (requires private key)
client.init_lease(agent_id_bytes, 7).await?;  // 7 epochs
```

## Node CLI Flags

```bash
zerox1-node \
  --base-rpc-url https://sepolia.base.org \
  --base-registry 0x441A5B8eEb7204398F277F25Cce44b12C08e97E1 \
  --base-escrow 0xe67FB286543228040C564c66a88Cb7939C0F27E0 \
  --base-lease 0x8F97BcD74f377251733175505a341111185016DD \
  --base-stake-lock 0x623dF2DD6dE4c007D82e155b4b92B20eb34b07DB \
  --base-private-key $AGENT_PRIVATE_KEY \
  --base-auto-register
```

## Differences from Celo

| Feature | Celo | Base |
|---|---|---|
| Chain ID | 42220 / 11142220 | 8453 / 84532 |
| Block time | ~5s | ~2s |
| Epoch length | 43,200 blocks (~2.5 days) | 43,200 blocks (~1 day) |
| Native gas token | CELO | ETH |
| Mainnet status | Pending | Pending |
| Testnet status | Live (Celo Sepolia) | Live (Base Sepolia) |
