# Smart Certificate Verification

On-chain certificate issuance and verification — a Solidity contract (Hardhat) plus a React
frontend, deployed on Ethereum Sepolia.

Every certificate is bound to the **SHA-256 hash of its document**. An authorized issuer registers
a file's hash on-chain; anyone later holding that file can hash it in their browser and check the
result against the contract. If the document was altered by even one byte, the hash won't match and
verification fails. No trust in the issuer's website or database required.

**Live contract:** [`0xa62ae72D24AFE719e923Bac1C716752437E498c2`](https://sepolia.etherscan.io/address/0xa62ae72D24AFE719e923Bac1C716752437E498c2#code)
(verified source on Sepolia Etherscan)

## Contract overview

`contracts/SmartCertificateVerification.sol`

| Function | Who can call | Purpose |
| --- | --- | --- |
| `issueCertificate(fileHash, recipient, recipientName, courseName, metadataURI, expiresAt)` | authorized issuers | Certify one document, returns the certificate ID |
| `issueBatch(fileHashes[], recipients[], recipientNames[], courseName, metadataURI, expiresAt)` | authorized issuers | Certify many documents for one course |
| `verifyByFileHash(fileHash)` | anyone | **The main entry point.** Returns `(valid, status, certificateId, certificate)` |
| `verifyCertificate(id)` | anyone | Same, looked up by certificate ID |
| `certificateIdByFileHash(fileHash)` | anyone | The ID registered for a document, or zero |
| `revokeCertificate(id)` / `revokeByFileHash(hash)` | issuing issuer, or owner | Permanently invalidate a certificate |
| `isValid(id)` / `statusOf(id)` | anyone | Lightweight validity checks |
| `getCertificate(id)` | anyone | Full certificate data (reverts if unknown) |
| `certificatesOf(wallet)` | anyone | Every certificate ID held by a wallet |
| `authorizeIssuer(addr)` / `revokeIssuer(addr)` | owner | Manage who may issue |
| `transferOwnership(addr)` + `acceptOwnership()` | owner / pending owner | Two-step ownership handover |

**Status values:** `NonExistent (0)`, `Valid (1)`, `Revoked (2)`, `Expired (3)`.

Notes on the design:

- **One certificate per document.** Re-issuing an already-certified file reverts with
  `FileHashAlreadyRegistered`.
- **Certificate IDs** are `keccak256` over an incrementing nonce plus the contract address, chain
  ID, issuer, recipient and file hash — using `abi.encode`, not `abi.encodePacked`, so two adjacent
  dynamic fields cannot collide. The nonce means identical certificates issued in the same block
  still get distinct IDs.
- **`expiresAt = 0`** means the certificate never expires.
- **`recipient = address(0)`** issues a certificate not bound to any wallet; only non-zero
  recipients are indexed for `certificatesOf`.
- Revoking an issuer does **not** invalidate certificates they previously issued.

## Setup

```bash
npm install
npm run compile
npm test          # 28 tests
```

## Frontend

A React + Vite app in `frontend/` with two pages:

- **Verify** — upload a file, it's hashed locally with the Web Crypto API and checked against the
  contract. Shows Valid / Revoked / Expired / Not Found with the certificate details. Works with no
  wallet installed (reads go through a public RPC).
- **Issue** — connect MetaMask, upload a file, fill in recipient and course, and issue. Requires the
  connected wallet to be an authorized issuer.

```bash
npm run frontend:dev     # http://localhost:5173
npm run frontend:build
```

The ABI and contract address are generated into `frontend/src/contract/`. After any contract change
or redeploy, regenerate them:

```bash
npm run export-abi
```

Override the defaults with a `frontend/.env` if needed:

```
VITE_CONTRACT_ADDRESS=0x...
VITE_RPC_URL=https://your-sepolia-rpc
```

> The file itself never leaves the browser — only its hash is used. Hashing needs a secure context,
> so it works on `localhost` and any `https://` deployment.

## Deploying to Sepolia

### 1. Fill in `.env`

Copy `.env.example` to `.env` and fill in:

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

### 3. Verify the source on Etherscan

```bash
npx hardhat verify --network sepolia <deployed-address>
```

Requires `ETHERSCAN_API_KEY`. Note the config uses a single top-level `apiKey` string — the
per-network object form routes to Etherscan's retired v1 endpoint and fails.

### 4. Certify a document from the CLI

```bash
FILE=./diploma.pdf npm run issue:sepolia
```

Hashes the file, issues the certificate, then reads it back by hash — the same round trip the
frontend performs. Override with `RECIPIENT_NAME`, `COURSE_NAME`, `RECIPIENT_ADDRESS`,
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
test/SmartCertificateVerification.js         28 tests
scripts/deploy.js                            deployment with preflight checks
scripts/issue-certificate.js                 hash a file, issue, verify back
scripts/export-abi.js                        copy ABI + address into the frontend
deployments/<network>.json                   recorded addresses
frontend/                                    React + Vite + Tailwind app
  src/pages/Verify.jsx                       upload a file, check it on-chain
  src/pages/Issue.jsx                        upload a file, certify it
  src/lib/hash.js                            SHA-256 via Web Crypto
  src/lib/contract.js                        ethers wiring, wallet, error decoding
```
