# disciplr-backend

API and milestone engine for [Disciplr](https://github.com/your-org/Disciplr): programmable time-locked capital vaults on Stellar.

## What it does

- **Health:** `GET /api/health` - service status and timestamp.
- **Auth:**
  - `POST /api/auth/login` - mock login and audit logging.
  - `POST /api/auth/users/:id/role` - role changes (admin only) with audit logging.
- **Vaults:**
  - `GET /api/vaults` - list all vaults (in-memory placeholder).
  - `POST /api/vaults` - create a vault.
  - `GET /api/vaults/:id` - get a vault by id.
  - `POST /api/vaults/:id/cancel` - cancel a vault (creator/admin) with audit logging.
- **Admin:**
  - `POST /api/admin/overrides/vaults/:id/cancel` - admin override to cancel vault with audit logging.
  - `GET /api/admin/audit-logs` - admin-only audit log query endpoint.
  - `GET /api/admin/audit-logs/:id` - admin-only single audit log lookup.

## User Audit Logging (Issue #45)

This project now tracks sensitive actions in an in-memory `audit_logs` table shape:

- `id`
- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `metadata`
- `created_at`

Current audited actions:

- `auth.login`
- `auth.role_changed`
- `vault.created`
- `vault.cancelled`
- `admin.override`

Admin-only access requirements for audit query endpoints:

- `x-user-role: admin`
- `x-user-id: <admin-user-id>`

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

API runs at **http://localhost:3000**.

### Scripts

| Command         | Description                     |
|-----------------|---------------------------------|
| `npm run dev`   | Run with tsx watch (hot reload) |
| `npm run build` | Compile TypeScript to `dist/`   |
| `npm run start` | Run compiled `dist/index.js`    |
| `npm run lint`  | Run ESLint on `src`             |

### Example: login (audit logged)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-1"}'
```

### Example: change role (audit logged, admin only)

```bash
curl -X POST http://localhost:3000/api/auth/users/user-2/role \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -H "x-user-id: admin-1" \
  -d '{"role":"verifier"}'
```

### Example: query audit logs (admin only)

```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs?action=vault.cancelled&limit=20" \
  -H "x-user-role: admin" \
  -H "x-user-id: admin-1"
```
