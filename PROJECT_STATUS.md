# OTR-India MVP — Project Status

Single-owner consolidation. Rule unchanged from the original project: never
check a box unless it's actually implemented **and verified working**
(build + tests + a real request/response, not just "code was written").

Last updated: 2026-09-03

## Backend — verified working

- [x] Auth (register/login, JWT, scrypt password hashing)
- [x] OTR profile (create at registration, read/update, address + education)
- [x] Government client registry (`SSC_EXAM_PORTAL`, `SCHOLARSHIP_PORTAL`), seeded at startup, scope ceiling enforced server-side
- [x] Consent decisions — grant/deny, rejects out-of-scope requests before writing anything
- [x] Access tokens — opaque, scoped, expiring, revocable; re-validated on every retrieval
- [x] Canonical ↔ portal field mapping (interoperability layer) for both mock portals
- [x] Data-minimization enforcement — verified by test that a non-granted field is genuinely absent from the response, not just "not displayed"
- [x] Document upload → `USER_PROVIDED` credential (never auto-`VERIFIED`)
- [x] Profile response now includes real `credentials[]` (was hardcoded `[]` in the original foundation — fixed during this pass)
- [x] Application submission, reference ID generation, linked to (but not dependent on) the access token
- [x] Persistent audit log covering all of the above
- [x] 26/26 tests passing against a live Postgres; `tsc --noEmit` and full `npm run build` both clean

## Frontend — rewired, builds clean

- [x] `api/` layer for government-clients, consent, access, documents, applications, audit
- [x] `PortalsPage` — lists live registered clients
- [x] `ConsentReviewPage` — real consent decision + missing-credential detection/upload flow
- [x] `ApplicationFormPage` — plays the **portal's** role: retrieves data only via `POST /api/access/data` with the token, never reads the citizen's own profile; includes a "generate admit card later" demo of token reuse
- [x] `CredentialsPage`, `DashboardPage` (applications / consent history / audit trail / access-token management incl. revoke) — all real API calls
- [x] `mock/` layer fully removed — nothing in the frontend reads from sessionStorage as a database anymore
- [x] `tsc -b` and `vite build` both clean

## Not yet done / explicitly deferred

- [ ] Second-portal (`SCHOLARSHIP_PORTAL`) full manual click-through — backend supports it identically to SSC, untested end-to-end via UI
- [ ] Consent/token **expiry** UI treatment (revocation works; expiry is enforced server-side but not specifically exercised in the UI)
- [ ] No automated frontend tests (backend risk surface is the one that's tested; frontend was verified via `tsc`/build only, not click-through — no browser available in this environment)
- [ ] Real file bytes for documents (metadata only, by design — see `docs/ARCHITECTURE_DECISIONS.md`)
- [ ] Nothing pushed to GitHub yet — exists only in the sandbox this was built in

## Known engineering decisions worth flagging back to the team

- Access tokens are **not** JWTs — bare random opaque strings looked up server-side. Deliberate: makes them genuine capability references, revocable by deleting server-side state, not just by key rotation.
- `POST /api/access/data` is intentionally **not** behind citizen JWT auth — the caller there is the portal, not the citizen's browser session. The opaque token itself is the credential.
- Missing-document detection is credential-based (`credentials[].type`), not education-record-based — matches the actual "missing 12th marksheet" demo story more precisely than checking structured education rows.
