# disciplr-backend

API and milestone engine for [Disciplr](https://github.com/your-org/Disciplr): programmable time-locked capital vaults on Stellar.

## What it does

- **Health:** `GET /api/health` - service status and timestamp.
- **Vaults:**
  - `GET /api/vaults` - list all vaults (in-memory placeholder).
  - `POST /api/vaults` - create a vault (body: `creator`, `amount`, `endTimestamp`, `successDestination`, `failureDestination`, optional `milestones`).
  - `GET /api/vaults/:id` - get a vault by id.
  - `POST /api/vaults/:id/milestones/:mid/validate` - validate an assigned milestone as verifier.

Data is stored in memory for now. Production would use PostgreSQL, a Horizon listener for on-chain events, and a proper milestone/verification engine.

## Milestone validation behavior

- Enforces verifier role via `x-user-role: verifier` header.
- Enforces assigned verifier via `x-user-id` matching milestone `verifierId`.
- Persists validation event in `vault.validationEvents`.
- Updates milestone state (`pending` -> `validated`) and `validatedAt`/`validatedBy`.
- Emits domain events in `vault.domainEvents`:
  - `milestone.validated` for every successful validation.
  - `vault.state_changed` when all milestones are validated and vault transitions to `completed`.

## Tech stack

- **Node.js** + **TypeScript**
- **Express** for HTTP API
- **Helmet** and **CORS** for security and cross-origin

## Local setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Install and run

```bash
# From repo root
cd disciplr-backend
npm install
npm run dev
```

API runs at **http://localhost:3000**. Frontend dev server can proxy `/api` to this port.

### Scripts

| Command         | Description                     |
|-----------------|---------------------------------|
| `npm run dev`   | Run with tsx watch (hot reload) |
| `npm run build` | Compile TypeScript to `dist/`   |
| `npm run start` | Run compiled `dist/index.js`    |
| `npm run lint`  | Run ESLint on `src`             |

### Example: create a vault with milestones

```bash
curl -X POST http://localhost:3000/api/vaults \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "GCREATOR...",
    "amount": "1000",
    "endTimestamp": "2026-12-31T23:59:59Z",
    "successDestination": "GSUCCESS...",
    "failureDestination": "GFAIL...",
    "milestones": [
      {
        "id": "ms-kyc",
        "title": "Complete KYC",
        "verifierId": "user-verifier-1"
      }
    ]
  }'
```

### Example: validate a milestone

```bash
curl -X POST http://localhost:3000/api/vaults/<vaultId>/milestones/ms-kyc/validate \
  -H "Content-Type: application/json" \
  -H "x-user-role: verifier" \
  -H "x-user-id: user-verifier-1" \
  -d '{
    "notes": "KYC docs verified"
  }'
```

## Project layout

```text
disciplr-backend/
|- src/
|  |- routes/
|  |  |- health.ts
|  |  `- vaults.ts
|  `- index.ts
|- package.json
|- tsconfig.json
`- README.md
```

## Merging into a remote

This directory is a separate git repo. To push to your own remote:

```bash
cd disciplr-backend
git remote add origin <your-disciplr-backend-repo-url>
git push -u origin main
```

Replace `<your-disciplr-backend-repo-url>` with your actual repository URL.
