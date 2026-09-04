# Smart Certificate Verification

On-chain certificate issuance and verification, built with Hardhat and Solidity 0.8.24.

An authorized issuer (a university, training provider, employer) issues a certificate to a
recipient. Anyone holding the resulting certificate ID can verify it — no trust in the issuer's
website or database required. Certificates can be revoked, and can optionally expire.

## Contract overview

`contracts/SmartCertificateVerification.sol`

| Function | Who can call | Purpose |
| --- | --- | --- |
| `issueCertificate(recipient, recipientName, courseName, metadataURI, expiresAt)` | authorized issuers | Issue one certificate, returns its ID |
| `issueBatch(recipients[], recipientNames[], courseName, metadataURI, expiresAt)` | authorized issuers | Issue the same course to many recipients |
| `revokeCertificate(id)` | the issuing issuer, or owner | Permanently invalidate a certificate |
| `verifyCertificate(id)` | anyone | Returns `(valid, status, certificate)` |
| `isValid(id)` / `statusOf(id)` | anyone | Lightweight validity checks |
| `getCertificate(id)` | anyone | Full certificate data (reverts if unknown) |
| `certificatesOf(wallet)` | anyone | Every certificate ID held by a wallet |
| `authorizeIssuer(addr)` / `revokeIssuer(addr)` | owner | Manage who may issue |
| `transferOwnership(addr)` + `acceptOwnership()` | owner / pending owner | Two-step ownership handover |

**Status values:** `NonExistent (0)`, `Valid (1)`, `Revoked (2)`, `Expired (3)`.

Notes on the design:

- **Certificate IDs** are `keccak256` over an incrementing nonce plus the contract address, chain
  ID, issuer, recipient and names — using `abi.encode`, not `abi.encodePacked`, so two adjacent
  string fields cannot collide. The nonce means identical certificates issued in the same block
  still get distinct IDs.
- **`expiresAt = 0`** means the certificate never expires.
- **`recipient = address(0)`** issues a certificate not bound to any wallet; only non-zero
  recipients are indexed for `certificatesOf`.
- Revoking an issuer does **not** invalidate certificates they previously issued.

## Setup

```bash
npm install
npm run compile
npm test
```

## Deploying to Sepolia

### 1. Fill in `.env`

Copy `.env.example` to `.env` (already created for you) and fill in:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=optional_for_source_verification
```

- **Alchemy URL** — create an app at alchemy.com on the *Ethereum Sepolia* network and copy its
  HTTPS URL.
- **Private key** — MetaMask → account menu (⋮) → *Account details* → *Show private key*. Use a
  dedicated testnet account, never one holding real funds. The `0x` prefix is optional; the config
  normalizes it and warns if the key is malformed.
- **Test ETH** — fund the deployer address from https://www.alchemy.com/faucets/ethereum-sepolia.

`.env` is gitignored. Never commit it.

### 2. Deploy

```bash
npm run deploy:sepolia
```

The script preflights your `.env`, checks the deployer's balance, waits for 5 confirmations, and
writes the address to `deployments/sepolia.json`.

### 3. Verify the source on Etherscan (optional)

```bash
npx hardhat verify --network sepolia <deployed-address>
```

### 4. Issue a test certificate

```bash
npm run issue:sepolia
```

Override the defaults with env vars: `RECIPIENT_NAME`, `COURSE_NAME`, `RECIPIENT_ADDRESS`,
`METADATA_URI`, `CONTRACT_ADDRESS`.

## Local development

```bash
npm run node             # terminal 1: local chain
npm run deploy:local     # terminal 2: deploy against it
npm run test:gas         # tests with a gas usage report
```

## Project layout

```
contracts/SmartCertificateVerification.sol   the contract
test/SmartCertificateVerification.js         21 tests
scripts/deploy.js                            deployment with preflight checks
scripts/issue-certificate.js                 issue + verify against a deployment
deployments/<network>.json                   recorded addresses
```
