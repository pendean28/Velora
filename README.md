# Velora

A blockchain-based supply chain trust and certification platform designed to ensure transparency, authenticity, and ethical sourcing — all verified and traceable on-chain.

---

## Overview

Velora consists of ten main smart contracts that work together to provide a decentralized, auditable, and secure supply chain certification ecosystem:

1. **Batch NFT Contract** – Tokenizes product batches with immutable metadata.
2. **Compliance Certificate Contract** – Issues, revokes, and verifies compliance certificates.
3. **Auditor Registry Contract** – Manages approved third-party certifiers and attestors.
4. **Supply Step Log Contract** – Records each step in the supply chain (e.g. manufacture, shipping, delivery).
5. **Dispute Resolver Contract** – Handles disputes between suppliers, auditors, and retailers.
6. **QA Oracle Connector Contract** – Connects with oracles for quality or environmental data (e.g. temperature logs).
7. **Reputation System Contract** – Tracks reputation scores of supply chain actors.
8. **Access Control Manager Contract** – Governs roles and permissions within the system.
9. **Event Logger Contract** – Emits events for off-chain monitoring and real-time auditing tools.
10. **Consumer Verifier Contract** – Allows end users to verify a product’s origin and legitimacy.

---

## Features

- **Tokenized product batches** for traceable and immutable item tracking  
- **On-chain compliance certificates** issued and verified by certified auditors  
- **Auditor staking and slashing** to ensure accountability  
- **Full lifecycle logging** of product movement and ownership  
- **Dispute resolution system** for transparency in disagreements  
- **Oracle integration** for quality control data like temperature, location, etc.  
- **Reputation system** to incentivize trust and good behavior  
- **Modular access control** across manufacturers, retailers, and auditors  
- **Real-time monitoring** via emitted events and data indexers  
- **Consumer-facing verification tool** for validating product origins  

---

## Smart Contracts

### Batch NFT Contract
- Mints ERC721-style NFTs for each product batch
- Metadata includes origin, timestamp, location, and manufacturer
- Immutable ownership history for each batch

### Compliance Certificate Contract
- Issues certificates linked to specific batches
- Time-bound and revocable by issuer or dispute system
- Supports multiple certification types (e.g. Organic, ISO, Fair Trade)

### Auditor Registry Contract
- Registers and manages certified auditors
- Includes staking, slashing, and role management
- Enforces reputation thresholds and dispute participation

### Supply Step Log Contract
- Logs supply chain events (e.g. manufactured, shipped, received)
- Timestamped and signed by authorized actors
- Enforces step order and prevents skips or tampering

### Dispute Resolver Contract
- Accepts on-chain disputes tied to specific batches or certificates
- Allows for evidence submission and DAO-based resolution
- Supports penalties and certificate revocations

### QA Oracle Connector Contract
- Integrates with data providers for QA metrics (temperature, humidity)
- Pushes data into step logs or triggers contract events
- Works with Chainlink or similar decentralized oracle networks

### Reputation System Contract
- Calculates and updates reputation scores based on behavior
- Penalizes actors for disputes, missed steps, or false attestations
- Incentivizes reliable participation and transparency

### Access Control Manager Contract
- Modular RBAC system for manufacturers, transporters, certifiers, etc.
- Supports granular permissions across contracts
- Prevents unauthorized step updates or certifications

### Event Logger Contract
- Emits events for all critical transactions and changes
- Enables off-chain monitoring and real-time dashboards
- Supports alerting tools for anomalies or violations

### Consumer Verifier Contract
- Lightweight read-only smart contract for consumers
- Verifies authenticity, origin, and certification status of a batch
- Can be integrated into mobile apps or QR code scanners

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)  
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/velora.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```
    clarinet deploy
    ```

---

## Usage

Each smart contract is modular and can be used independently or integrated with others.
Refer to the /contracts folder and inline documentation for specific usage, arguments, and examples.

For real-time data visualization and alerts, use the Event Logger Contract in combination with tools like The Graph, Chainlink Functions, or custom indexers.

---

## License

MIT License