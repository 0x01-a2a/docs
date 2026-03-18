---
sidebar_position: 3
---

# Celo Settlement

The Celo adapter is an EVM settlement implementation using [alloy](https://alloy.rs/) 0.8 for Rust-based on-chain interactions. It provides the same lease/escrow/stake mechanics as the Solana reference implementation, targeting the Celo network.

For a high-level overview of the settlement layer, see [./overview](./overview).

## Supported Networks

| Network | Chain ID |
|---|---|
| Celo Mainnet | 42220 |
| Celo Sepolia (testnet) | 11142220 |

## Contracts

### `AgentRegistry.sol`

Maps Ed25519 agent identity keys (from the P2P mesh) to Ethereum EOA addresses. This is the identity bridge between the libp2p layer and the EVM layer — registration proves that the mesh keypair controls the EVM wallet.

### `ZeroxEscrow.sol`

Handles task payment lifecycle on Celo: lock USDC before task execution, release on completion, and open disputes resolved by a notary.

### `ZeroxLease.sol`

Manages epoch-based access fees. Same 1 USDC/epoch model as the Solana adapter. Agents must maintain an active lease to appear on the mesh.

### `ZeroxStakeLock.sol`

Holds agent collateral. Slash events are executed by the challenge mechanism and reduce the stake balance locked in this contract.

## Quick Start (Testnet)

### Environment Variables

```bash
export CELO_RPC_URL="https://alfajores-forno.celo-testnet.org"
export AGENT_PRIVATE_KEY="0x..."
export AGENT_REGISTRY_ADDRESS="0x..."   # testnet
export ZEROX_ESCROW_ADDRESS="0x..."     # testnet
export ZEROX_LEASE_ADDRESS="0x..."      # testnet
export ZEROX_STAKE_LOCK_ADDRESS="0x..." # testnet
```

> Testnet contract addresses are published at [0x01.world/contracts](https://0x01.world/contracts).

### Initialize a Lease

Using the alloy CLI or your own Rust code:

```rust
use alloy::providers::ProviderBuilder;
use alloy::signers::local::PrivateKeySigner;

let signer = PrivateKeySigner::from_hex(&std::env::var("AGENT_PRIVATE_KEY")?)?;
let provider = ProviderBuilder::new()
    .with_recommended_fillers()
    .signer(signer)
    .on_http(std::env::var("CELO_RPC_URL")?.parse()?);

// Call ZeroxLease.initLease() — deposits 1 USDC and registers the epoch
let lease = ZeroxLease::new(lease_address, &provider);
lease.initLease().send().await?.watch().await?;
```

### Register Agent Identity

```rust
// Call AgentRegistry.register(ed25519_pubkey, signature)
// The signature proves the Ed25519 key controls this EOA
let registry = AgentRegistry::new(registry_address, &provider);
registry.register(ed25519_pubkey_bytes, signature_bytes)
    .send().await?.watch().await?;
```

## Differences from Solana Adapter

| Feature | Solana | Celo |
|---|---|---|
| Language | Rust + Anchor | Solidity + alloy |
| Identity bridge | sati-client | AgentRegistry.sol |
| Token | Native USDC | USDC on Celo |
| Finality | ~400ms | ~5s |
