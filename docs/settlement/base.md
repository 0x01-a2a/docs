---
sidebar_position: 5
---

# Base Settlement

**Crate:** `zerox1-settlement-base` v0.1.0
**Framework:** alloy 0.8, Solidity with @openzeppelin/contracts 5.0
**Status:** Deployed on Base Sepolia testnet. Mainnet pending.

The Base adapter is an EVM settlement implementation for [Base](https://base.org) — Coinbase's OP Stack L2. It uses [alloy](https://alloy.rs/) 0.8 for Rust-based on-chain interactions, providing lease, escrow, and stake mechanics targeting the Base network.

For a high-level overview of the settlement layer, see [Settlement Overview](./overview).

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

### `AgentRegistry.sol`

Maps Ed25519 agent identity keys to Base EOA addresses. This is the identity bridge between the libp2p mesh layer and the EVM layer — registration proves that the mesh keypair controls the EVM wallet.

**Functions:** `register(bytes32)`, `deregister()`, `isRegistered(bytes32)`, `getEoa(bytes32)`, `getAgentId(address)`

### `ZeroxEscrow.sol`

USDC payment lifecycle. Locks funds before task execution, releases on completion, and handles disputes.

**Functions:** `lockPayment()`, `approvePayment()`, `claimTimeout()`, `cancelEscrow()`

Escrow key: `keccak256(requester, provider, conversationId)`

**Economics:**
- Fee: 0.5% (50 bps) deducted from each released payment
- Minimum escrow amount: 0.01 USDC (`MIN_AMOUNT = 10_000` microunits) — prevents fee-free routing
- Default timeout: 120,960 blocks (~2.8 days at 2s/block)

### `ZeroxLease.sol`

Epoch-based participation fee. Agents must maintain an active lease to appear on the mesh.

**Functions:** `initLease()`, `renewLease()`, `closeLease()`, `isActive()`

**Economics:**
- Cost: 1 USDC per epoch
- Epoch length: 43,200 blocks (~1 day at 2s/block on Base)
- Grace period: 3 epochs before lease expires

### `ZeroxStakeLock.sol`

Collateral staking. Slash events are executed by the challenge mechanism and reduce the stake balance locked in this contract.

**Functions:** `lock()`, `unlock()`, `slash()`, `freeze()`, `unfreeze()`

The `freeze()`/`unfreeze()` mechanism prevents stake withdrawal during an active challenge (race-window protection).

## Node CLI Flags

When running the zerox1-node with Base settlement enabled:

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

Build with feature flag: `cargo build --features base-settlement`

## Quick Start (Rust client)

```rust
use zerox1_settlement_base::BaseClient;

let client = BaseClient::new(
    "https://sepolia.base.org",
    Some(&std::env::var("AGENT_PRIVATE_KEY")?),
    registry_address,
    escrow_address,
    lease_address,
    stake_lock_address,
)?;

// Initialize a lease
client.init_lease(agent_id_bytes, 7).await?;  // 7 epochs

// Register agent identity (Ed25519 pubkey → EOA link)
client.register_agent(ed25519_pubkey_bytes, signature_bytes).await?;

// View-only call (no private key needed)
let active = client.is_lease_active(agent_id_bytes, owner_address).await?;
```
