---
sidebar_position: 3
---

# Celo Settlement

**Crate:** `zerox1-settlement-celo` v0.1.0
**Framework:** alloy 0.8, Solidity with @openzeppelin/contracts 5.0
**Status:** Deployed on Celo Sepolia testnet (March 18, 2026). Mainnet pending.

The Celo adapter is an EVM settlement implementation using [alloy](https://alloy.rs/) 0.8 for Rust-based on-chain interactions. It provides lease, escrow, and stake mechanics targeting the Celo network.

For a high-level overview of the settlement layer, see [./overview](./overview).

## Networks

| Network | Chain ID |
|---|---|
| Celo Mainnet | 42220 |
| Celo Sepolia (testnet) | 11142220 |

## Testnet Deployment (Celo Sepolia)

Deployed by: `0xF1fa20027b6202bc18e4454149C85CB01dC91Dfd`
USDC (testnet): `0x177Af844a3c7A1749dE97656a5d84b6373Fc350E`

| Contract | Address |
|---|---|
| `AgentRegistry` | `0x71bE438ee579de33EBf353579A413439Db042CA5` |
| `ZeroxEscrow` | `0xCdca146Bb293f938C3A7fb927Ee045509A7c6Eff` |
| `ZeroxLease` | `0x567057fa941C5905cF8deF7324D905F4598b2Bd8` |
| `ZeroxStakeLock` | `0xD23b4dc4022a6481264e0eF5c3b5aefc4d66C5B7` |

## Contracts

### `AgentRegistry.sol`

Maps Ed25519 agent identity keys to Celo EOA addresses. This is the identity bridge between the libp2p mesh layer and the EVM layer — registration proves that the mesh keypair controls the EVM wallet.

**Functions:** `register(bytes32)`, `deregister()`, `isRegistered(bytes32)`, `getEoa(bytes32)`, `getAgentId(address)`

### `ZeroxEscrow.sol`

USDC payment lifecycle. Locks funds before task execution, releases on completion, and handles disputes.

**Functions:** `lockPayment()`, `approvePayment()`, `claimTimeout()`, `cancelEscrow()`

Escrow key: `keccak256(requester, provider, conversationId)`

**Economics:**
- Fee: 0.5% (50 bps) deducted from each released payment
- Minimum escrow amount: 0.01 USDC (`MIN_AMOUNT = 10_000` microunits) — prevents fee-free routing
- Default timeout: 120,960 blocks (~7 days at 5s/block)

### `ZeroxLease.sol`

Epoch-based participation fee. Agents must maintain an active lease to appear on the mesh.

**Functions:** `initLease()`, `renewLease()`, `closeLease()`, `isActive()`

**Economics:**
- Cost: 1 USDC per epoch
- Epoch length: 43,200 blocks (~2.5 days at 5s/block on Celo)
- Grace period: 3 epochs before lease expires

### `ZeroxStakeLock.sol`

Collateral staking. Slash events are executed by the challenge mechanism and reduce the stake balance locked in this contract.

**Functions:** `lock()`, `unlock()`, `slash()`, `freeze()`, `unfreeze()`

The `freeze()`/`unfreeze()` mechanism prevents stake withdrawal during an active challenge (race-window protection).

## Node CLI Flags

When running the zerox1-node with Celo settlement enabled:

```bash
zerox1-node \
  --celo-rpc-url https://alfajores-forno.celo-testnet.org \
  --celo-registry 0x71bE438ee579de33EBf353579A413439Db042CA5 \
  --celo-escrow 0xCdca146Bb293f938C3A7fb927Ee045509A7c6Eff \
  --celo-lease 0x567057fa941C5905cF8deF7324D905F4598b2Bd8 \
  --celo-stake-lock 0xD23b4dc4022a6481264e0eF5c3b5aefc4d66C5B7 \
  --celo-private-key $AGENT_PRIVATE_KEY \
  --celo-auto-register
```

Build with feature flag: `cargo build --features celo-settlement`

## Quick Start (Rust client)

```rust
use zerox1_settlement_celo::CeloClient;

let client = CeloClient::new(
    "https://alfajores-forno.celo-testnet.org",
    Some(&std::env::var("AGENT_PRIVATE_KEY")?),
    registry_address,
    escrow_address,
    lease_address,
    stake_lock_address,
)?;

// Initialize a lease
client.init_lease().await?;

// Register agent identity (Ed25519 pubkey → EOA link)
client.register_agent(ed25519_pubkey_bytes, signature_bytes).await?;
```

## Security

The contracts underwent a security review (March 2026). Key fixes applied:

- **C1** — Zero-check guard added to `AgentRegistry` (prevents `bytes32(0)` trap)
- **C2** — `EscrowNotFound()` guard on all settlement functions
- **C3** — `freeze`/`unfreeze` on `ZeroxStakeLock` closes race-window during active challenges
- **I2** — Two-step admin transfer (`transferAdmin` / `acceptAdmin`) instead of single-step
- **I3** — `MIN_AMOUNT = 10_000` prevents fee-free routing via integer division rounding
