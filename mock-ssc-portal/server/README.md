# mock-ssc-portal/server

The minimal server-side bridge for the standalone mock SSC portal
(GovRecruit-A), added in Phase 3.

## Why this exists

`mock-ssc-portal`'s frontend is a Vite/React SPA — nothing shipped to the
browser can safely hold a government client secret. But OTR-India's
Phase 2 authorization-request endpoint
(`POST /api/government-clients/requests`) requires exactly that: HTTP
Basic `client_id:secret` authentication, proving the call genuinely comes
from GovRecruit-A's own backend, not a browser that merely knows its
`client_id` string.

This is the smallest possible thing that can hold that secret: one route,
one job.

## What it does — and does not — do

- **Does:** authenticate to OTR (`SSC_OTR_CLIENT_ID` / `SSC_OTR_CLIENT_SECRET`),
  call `POST /api/government-clients/requests` with this client's own
  fixed `redirectUri` and `requestedFields` (never anything the browser
  sends it), and hand back only the opaque `requestId` + `expiresAt`.
- **Does not** become a second full backend for GovRecruit-A. Application
  records, the retrieved-data screen, and the rest of the citizen-facing
  flow are unchanged from before Phase 3 — they still talk to OTR's
  backend directly from the browser using the access token, exactly as
  documented in `docs/ARCHITECTURE_DECISIONS.md` §8.
- **Never** receives or stores the citizen's OTR session, profile data,
  or access token. It only ever sees `{ purpose }` in and
  `{ requestId, expiresAt }` out.

## Local setup

```bash
cd mock-ssc-portal/server
cp .env.example .env
# paste the SSC_EXAM_PORTAL secret printed by the OTR backend's own
# startup log into SSC_OTR_CLIENT_SECRET
npm install
npm run dev     # listens on :4174
```

`mock-ssc-portal`'s own `vite.config.ts` proxies `/api/ssc/*` to
`http://localhost:4174` in dev, so the frontend calls it same-origin —
run both `npm run dev` (this package) and `npm run dev` in
`mock-ssc-portal/` alongside the OTR `backend/`.

## Production note

This is deliberately framework-light (plain Express) so it can be
redeployed as, e.g., a single Render/Vercel serverless function at
whatever path this app's hosting exposes as `/api/ssc/*` — the important
constraint carrying forward is only "the secret lives in server-only
env, never a `VITE_*` variable."
