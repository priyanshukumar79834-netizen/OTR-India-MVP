# OTR-India MVP — Project Status

Single-owner consolidation. Rule unchanged from the original project: never
check a box unless it's actually implemented **and verified working**
(build + tests + a real request/response, not just "code was written").

Last updated: 2026-09-05 (Application Details UX change + deployment-readiness pass)

## 2026-09-05 changes (this session)

- **UX change (requested):** `mock-ssc-portal`'s intermediate "Continue with OTR"
  screens (`OtrApplicationFormPage.tsx`, `OtrReviewPage.tsx`) no longer display
  the actual retrieved OTR values. Both now show a "Details fetched
  successfully" confirmation with a checkmark list of *categories*
  (Candidate details / Date of birth / Guardian's details / Contact
  information / Address / Educational details), derived from which fields
  OTR actually returned — never the values. This is a display-only change;
  `otrData` is still fetched from `/api/access/data` and still used
  internally to build the application. Verified via a full live end-to-end
  HTTP smoke test (see below) that the underlying retrieval/consent/token/
  application-submission behavior is unchanged.
- **Deployment-readiness fixes (found during inspection, both real gaps,
  not previously flagged):**
  1. `frontend/src/api/client.ts` hardcoded relative `/api/...` calls,
     which only resolve because of Vite's local dev-server proxy. Added
     `VITE_OTR_API_URL` (empty by default, so local dev is unaffected) so
     a deployed static build can point at the deployed backend. Documented
     in `frontend/.env.example`.
  2. `backend/src/db/client.ts`'s `pg.Pool` had no `ssl` option. Most
     hosted Postgres providers (Render, Neon, Railway, Supabase) require
     SSL and will refuse a plain connection. Added `DATABASE_SSL` env var
     (`backend/src/config/env.ts`), defaulting to `true` when
     `NODE_ENV=production` and `false` otherwise, so local dev/test is
     unaffected and a deployed backend connects successfully by default.
- **Verified, not just written:** backend 26/26 tests passing against a
  live local Postgres (freshly provisioned this session), `npm run build`
  clean for `backend`, `frontend`, and `mock-ssc-portal`. A full live HTTP
  smoke test was run against the running backend covering: register →
  complete profile → look up government client → grant consent → access
  token issued → SSC retrieves mapped data cross-origin (Origin header
  simulated) → deny-consent issues no token → out-of-scope request
  rejected `403 SCOPE_NOT_ALLOWED` → application submitted via-token →
  same token reused for admit-card retrieval with no new consent →
  application visible on citizen dashboard → garbage token rejected `401
  INVALID_TOKEN` → submitted-application token shows
  `linkedApplicationRefId`. All steps passed. CORS preflight verified
  directly: an allow-listed origin gets a correct `204` with
  `Access-Control-Allow-Origin` echoed back; a non-allow-listed origin
  gets no CORS header (browser will block it) — the origin-rejection path
  currently returns a generic sanitized `500` rather than a `403`, which
  is a pre-existing minor inconsistency, not a security issue (no origin
  or error detail is leaked either way), left as-is since it wasn't part
  of this session's scope.
- Nothing pushed to GitHub — still local to this sandbox/session, per
  standing instruction not to push without explicit confirmation.

## Architecture — two separate websites, one backend

- [x] `backend/` (port 4000) — unchanged in shape from Sept 3, extended with CORS allow-list + `POST /api/applications/via-token`
- [x] `frontend/` (port 5173) — OTR-India's own citizen site; embedded portal pages removed, replaced with a real cross-site `/authorize` entry point
- [x] `mock-ssc-portal/` (port 5174) — new, standalone Vite/React app, distinct visual identity, no server of its own, calls `backend/` directly cross-origin

See `docs/ARCHITECTURE_DECISIONS.md` §8 for the full reasoning.

## Backend — verified working

- [x] Auth (register/login, JWT, scrypt password hashing)
- [x] OTR profile (create at registration, read/update, address + education)
- [x] Government client registry (`SSC_EXAM_PORTAL`, `SCHOLARSHIP_PORTAL`), seeded at startup, scope ceiling enforced server-side
- [x] Consent decisions — grant/deny, rejects out-of-scope requests before writing anything; denied decisions issue no access token (verified)
- [x] Access tokens — opaque, scoped, expiring, revocable; re-validated on every retrieval; a garbage/unrecognized token is rejected `401 INVALID_TOKEN` (verified on both endpoints that accept one)
- [x] Canonical ↔ portal field mapping (interoperability layer) for both mock portals
- [x] Data-minimization enforcement — verified live: `SSC_EXAM_PORTAL` requesting `contact.email` (outside its `allowedScopes`) is rejected `403 SCOPE_NOT_ALLOWED`
- [x] Document upload → `USER_PROVIDED` credential (never auto-`VERIFIED`)
- [x] Application submission, reference ID generation, linked to (but not dependent on) the access token
- [x] **New:** `POST /api/applications/via-token` — portal-facing application submission authenticated by the opaque access token, not a citizen JWT (for a genuinely separate portal site with no OTR session)
- [x] **New:** `CORS_ORIGIN` is now a comma-separated allow-list (both `frontend` and `mock-ssc-portal` origins) instead of a single origin
- [x] Persistent audit log covering all of the above
- [x] 26/26 tests passing against a live Postgres; `tsc --noEmit` and full `npm run build` both clean

## OTR-India frontend (`frontend/`) — rewired for the two-website architecture

- [x] `api/` layer for government-clients, consent, access, documents, applications, audit
- [x] `/authorize` (`AuthorizePage.tsx`) — the real cross-site consent entry point: reached only by an external redirect (`?client_id=&redirect_uri=`), not in-app navigation; redirects the browser back out on approve/deny with the token in the URL fragment
- [x] Login preserves the full path + query string through the `/login` redirect, so returning from login lands back on `/authorize?...` correctly
- [x] `PortalsPage`, `ApplicationFormPage`, the old route-param `ConsentReviewPage` — **removed**; that role now belongs to `mock-ssc-portal`
- [x] `CredentialsPage`, `DashboardPage` (applications / consent history / audit trail / access-token management incl. revoke) — unchanged, all real API calls; empty-state now links out to the real standalone SSC site instead of a removed internal route
- [x] `tsc -b` and `vite build` both clean

## Mock SSC portal (`mock-ssc-portal/`) — new, standalone

- [x] Own package.json, own Vite config (port 5174, no proxy — calls OTR's backend directly, cross-origin), own distinct visual identity (navy/saffron government palette + serif headings, vs. OTR's indigo/teal/amber)
- [x] `HomePage` / `ApplyStartPage` — professional mock examination-portal landing + a real "Continue with OTR" full-page redirect (`window.location.href` to OTR's `/authorize`, not a React Router link)
- [x] `CallbackPage` — receives the redirect back from OTR, reads the token from the URL fragment (never a query param), clears it from browser history immediately
- [x] `ApplicationFormPage` — retrieves authorized data via `POST /api/access/data` (read-only, clearly separated from SSC-specific fields), submits via `POST /api/applications/via-token`
- [x] `MyApplicationsPage` / `ApplicationDetailPage` — SSC's own client-side record of its applications (`localStorage`, namespaced to its own origin — see `docs/ARCHITECTURE_DECISIONS.md` §8 for why no second backend was built); the detail page's "Generate Admit Card" re-calls `/api/access/data` with the same stored token, demonstrating reuse without a new consent screen
- [x] `tsc -b` and `vite build` both clean

## End-to-end verification performed

Full cross-site flow exercised via direct HTTP calls replicating exactly
what each app's browser JS does: register → complete OTR profile → build
the `/authorize` URL as `ApplyStartPage.tsx` does → look up the client via
the public `/api/government-clients` endpoint as `AuthorizePage.tsx` does →
grant consent → simulate the fragment-carried-token redirect → call
`/api/access/data` cross-origin with `Origin: http://localhost:5174` (CORS
preflight confirmed to succeed) exactly as `ApplicationFormPage.tsx` does →
call `/api/applications/via-token` the same way → later, reuse the *same*
token against `/api/access/data` again for the admit-card step, no new
consent → confirm OTR's own citizen-JWT-authenticated `GET /api/applications`
dashboard endpoint shows the application. All steps returned the expected
data, correctly scoped and correctly mapped to portal field names.

## Not yet done / explicitly deferred

- [ ] Second-portal (`SCHOLARSHIP_PORTAL` / GovRecruit-B) has no standalone frontend — deliberate scope cut, see `docs/ARCHITECTURE_DECISIONS.md` §8; backend supports it identically (different `allowedScopes`, different field mapping)
- [ ] No real browser click-through of either frontend (no browser available in this sandbox) — both verified via `tsc`/`vite build` plus a full API-level simulation of the exact calls the browser JS makes, not an actual mouse-driven run
- [ ] Server-side `redirect_uri` allow-listing / standards-compliant OAuth2 code exchange — the access token currently travels in the URL fragment directly rather than through a separate short-lived code exchange
- [ ] Real file bytes for documents (metadata only, by design)
- [ ] Consent/token **expiry** UI treatment (revocation works; expiry is enforced server-side but not specifically exercised in either UI)
- [ ] Nothing pushed to GitHub yet — exists only in the sandbox this was built in

## Known engineering decisions worth flagging back to the team

- Access tokens are **not** JWTs — bare random opaque strings looked up server-side. Deliberate: makes them genuine capability references, revocable by deleting server-side state, not just by key rotation.
- `POST /api/access/data` and the new `POST /api/applications/via-token` are intentionally **not** behind citizen JWT auth — the caller there is the portal's own site, not the citizen's browser session. The opaque token itself is the credential; both share one `validateAccessToken()` check.
- The access token crosses from OTR's origin to the portal's origin via the redirect URL's **fragment**, not a query string — fragments aren't sent to any server, unlike query params. This is lighter-weight than a real OAuth code-exchange flow; flagged as a deliberate simplification, not an oversight (`docs/ARCHITECTURE_DECISIONS.md` §8).
- `mock-ssc-portal` keeps its own application/token records in `localStorage` rather than a second backend — a real deployment would have its own database here; this was a deliberate scope cut given the deadline.
- Missing-document detection is credential-based (`credentials[].type`), not education-record-based — matches the actual "missing 12th marksheet" demo story more precisely than checking structured education rows.
