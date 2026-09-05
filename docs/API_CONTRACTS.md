# OTR-India — API Contract Reference

Documents the API surface that actually exists in `backend/` right now, in
the format `MASTER_SPECIFICATION.md` §23 asks for (endpoint, method,
request/response shape, auth requirement, error format, status codes).

**Rule:** this file describes what's implemented and verified, not what's
planned. Add to it when you land a real endpoint; don't pre-document
something that doesn't exist yet — `PROJECT_STATUS.md` is where planned/
in-progress work belongs.

All responses use the shared envelope from `src/utils/apiResponse.ts`:

```json
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "error": { "code": "SOME_CODE", "message": "...", "details": { } } }
```

---

## `GET /api/health`

- **Auth:** none.
- **Response `200`:** `{ success: true, data: { status: "healthy", database: "connected", timestamp } }`
- **Response `503`:** `{ success: false, error: { code: "DB_UNAVAILABLE", ... } }` — DB connection failed.

## `POST /api/auth/register`

- **Auth:** none.
- **Request:** `{ email: string, password: string (min 8 chars), fullName: string }`
- **Response `201`:** `{ success: true, data: { token: string, otrId: string, userId: string } }`
- **Errors:** `400 VALIDATION_ERROR`, `409 EMAIL_IN_USE`.
- Side effect: creates a `users` row + a placeholder `profiles` row (DOB placeholder — citizen fills this in later via `PATCH /api/otr/profile`), and records a `PROFILE_UPDATED` audit event.

## `POST /api/auth/login`

- **Auth:** none.
- **Request:** `{ email: string, password: string }`
- **Response `200`:** `{ success: true, data: { token: string, otrId: string, userId: string } }`
- **Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.
- Records a `LOGIN` audit event (`SUCCESS` or `FAILURE`). A failed attempt is recorded with no `userId` — we don't attribute a failed login to a specific account.

## `GET /api/otr/profile`

- **Auth:** `Authorization: Bearer <token>` required.
- **Response `200`:** `{ success: true, data: CanonicalProfile }` — shape defined in `src/types/canonical.ts` (`otrId`, `identity`, `contact`, `address?`, `education[]`, `credentials[]`). `credentials` is currently always `[]` — populating it is Anchal's module.
- **Errors:** `401 UNAUTHENTICATED` (no token), `401 INVALID_TOKEN` (bad/expired token), `404 PROFILE_NOT_FOUND`.

## `PATCH /api/otr/profile`

- **Auth:** `Authorization: Bearer <token>` required.
- **Request (all fields optional):** `{ fullName?, dateOfBirth? (ISO 8601), gender?, guardianName?, mobile?, address?: { addressLine, city, state, pincode } }`
- **Response `200`:** `{ success: true, data: CanonicalProfile }` — the full updated profile.
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`/`INVALID_TOKEN`, `404 PROFILE_NOT_FOUND`.
- Records a `PROFILE_UPDATED` audit event.

## `GET /api/audit-logs`

Added as core/integration infrastructure — see `docs/ARCHITECTURE_DECISIONS.md` §7.

- **Auth:** `Authorization: Bearer <token>` required.
- **Query params:** `limit?` (integer, 1–200, default 50).
- **Response `200`:** `{ success: true, data: { entries: AuditLogEntry[] } }`, most recent first, where:
  ```ts
  interface AuditLogEntry {
    id: string;
    event: string;              // one of AUDIT_EVENTS, see auditEvents.ts
    requestingSystem: string | null;
    result: 'SUCCESS' | 'FAILURE';
    createdAt: string;          // ISO 8601
  }
  ```
- **Errors:** `400 VALIDATION_ERROR` (bad `limit`), `401 UNAUTHENTICATED`/`INVALID_TOKEN`.
- **Scope:** always the *authenticated user's own* history only — there is no cross-user query here. An admin-facing "all audit events" view (§25) is out of scope for this endpoint if it's ever built.
- **For Anchal/Harsh:** to emit your own events (`CONSENT_GRANTED`, `DATA_ACCESSED`, etc.), import `recordAuditEvent` from `backend/src/modules/audit/audit.service.ts` and use one of the constants in `backend/src/modules/audit/auditEvents.ts`. Don't insert into `audit_logs` directly and don't invent a new event string without adding it to `auditEvents.ts` first (one-line PR, not a big deal — just keeps the vocabulary closed).
- **For Adi:** this is the data source for the dashboard's "Access/Audit History" section (`MASTER_SPECIFICATION.md` §20).

---

## `POST /api/government-clients` (list)

`GET /api/government-clients`

- **Auth:** none — this is a public directory, deliberately: a government
  portal (or its consent screen on OTR) needs to know a client's display
  name and `allowedScopes` before any citizen session exists.
- **Response `200`:** `{ success: true, data: { entries: GovernmentClient[] } }` where:
  ```ts
  interface GovernmentClient {
    clientId: string;       // e.g. "SSC_EXAM_PORTAL"
    name: string;           // e.g. "GovRecruit-A"
    organisation: string;
    allowedScopes: string[]; // canonical field paths this client may ever request
  }
  ```
- Seeded clients: `SSC_EXAM_PORTAL` (GovRecruit-A), `SCHOLARSHIP_PORTAL` (GovRecruit-B).

## `POST /api/consent/decisions`

- **Auth:** `Authorization: Bearer <token>` required — this is the citizen deciding, on OTR's own site.
- **Request:** `{ clientId: string, requestedFields: string[], decision: "GRANTED" | "DENIED", purpose?: string }`
- **Response `201`:** `{ success: true, data: { consent: ConsentEntry, accessToken: { id, token, expiresAt } | null } }` — `accessToken` is `null` when `decision` is `"DENIED"`.
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`/`INVALID_TOKEN`, `404 UNKNOWN_CLIENT` (unregistered `clientId`), `403 SCOPE_NOT_ALLOWED` (a requested field isn't in the client's `allowedScopes` — the server-side data-minimization ceiling; `details.disallowed` lists the offending fields).
- Records `CONSENT_GRANTED`/`CONSENT_DENIED` audit events. This is the ONLY place an access token is minted.

## `GET /api/consent/history`

- **Auth:** required. Returns the caller's own consent decisions, most recent first.

## `POST /api/access/data`

- **Auth:** **none** (deliberately) — the caller here is a government portal's own site/server, not a citizen browser session. Authenticated instead by the opaque token in the body.
- **Request:** `{ token: string }`
- **Response `200`:** `{ success: true, data: { data: Record<string, unknown>, scopes: string[], clientId: string, purpose: string } }` — `data` is already mapped into the requesting portal's own field names (see `interop.service.ts`'s `PORTAL_MAPPINGS`), containing **only** the fields in `scopes`.
- **Errors:** `401 INVALID_TOKEN` (unrecognized), `403 TOKEN_REVOKED`, `403 TOKEN_EXPIRED`.
- Can be called **any number of times** while the token remains valid — this is what makes an authorization durable rather than a one-time handoff (used by `mock-ssc-portal`'s admit-card retrieval, days after the original application in the demo narrative).
- Must be reachable cross-origin from a genuinely separate portal site — see `CORS_ORIGIN` in `backend/.env`.

## `GET /api/access/tokens` / `POST /api/access/tokens/:id/revoke`

- **Auth:** required (citizen's own view/control). Revocation exists as a secondary capability on OTR's dashboard — deliberately not part of the primary demo flow (see `docs/ARCHITECTURE_DECISIONS.md` §8).

## `POST /api/applications` (citizen-JWT path)

- **Auth:** `Authorization: Bearer <token>` required.
- **Request:** `{ clientId, accessTokenId, applicationName, organisation, appSpecificData }`
- Kept for a caller that *does* hold a citizen session. The current demo flow uses the token-authenticated path below instead, since the portal submitting on the citizen's behalf never holds an OTR JWT.

## `POST /api/applications/via-token` — added Sept 4 2026

- **Auth:** **none by citizen JWT** (deliberately, same reasoning as `/api/access/data`) — authenticated by the opaque access token in the body. This is what `mock-ssc-portal` actually calls.
- **Request:** `{ token: string, applicationName: string, appSpecificData: Record<string, string> }`
- **Response `201`:** `{ success: true, data: ApplicationEntry }` (same shape `GET /api/applications` returns).
- **Errors:** `401 INVALID_TOKEN`, `403 TOKEN_REVOKED`, `403 TOKEN_EXPIRED`, `400 VALIDATION_ERROR`.
- Internally: validates the token (shared `validateAccessToken()` in `access.service.ts`), derives `userId` + `clientId` from it, looks up the client's display `organisation`, then calls the same `submitApplication()` the JWT path uses — one application-creation code path either way. Generates a real `applicationRefId` (`APP-<CLIENTID>-<YEAR>-XXXX`), independent of the access token (§12 — a token is not itself proof of submission).
- Registered **before** `requireAuth` in `applications.routes.ts` so it is genuinely not gated behind a citizen session.

## `GET /api/applications`

- **Auth:** required. Returns the caller's own submitted applications (from any portal), most recent first — this is what OTR's own Dashboard reads, and shows applications submitted via *either* the JWT path or the via-token path above, since both write to the same table.

## `POST /api/documents`

- **Auth:** required. `{ documentType: string, fileName: string, saveToProfile?: boolean }` — metadata only (no actual file bytes for the prototype); creates a `credentials` row with `verificationStatus: "USER_PROVIDED"`. Used by OTR's `/authorize` consent screen when a requested field is missing from the profile.

## `GET /api/documents`

- **Auth:** required. Lists the caller's own uploaded document/credential metadata.

---

## `GET /authorize` — OTR-India frontend, not a backend endpoint

Documented here because it's the actual integration point a separate
portal calls into, even though it's a frontend route, not an API:

- **URL:** `<OTR_FRONTEND_URL>/authorize?client_id=<string>&redirect_uri=<url>&purpose=<string?>`
- **Caller:** a separate site's browser, via a real full-page navigation (`window.location.href`), e.g. `mock-ssc-portal`'s `ApplyStartPage.tsx`.
- **Behavior:** requires an OTR login (redirects through `/login` and back, preserving the query string, if not already authenticated); looks up `client_id` via `GET /api/government-clients`; shows every field in that client's `allowedScopes` for review; on **Allow**, calls `POST /api/consent/decisions` then redirects the browser to `redirect_uri` with the issued token in the URL **fragment** (`#token=...&clientId=...&expiresAt=...`) — never a query param, since fragments aren't sent to any server; on **Cancel**, records a `DENIED` decision and redirects to `redirect_uri?denied=true`.
- **Not validated server-side:** `redirect_uri` is trusted as given (no server-side allow-list) — acceptable for a same-machine hackathon demo, a real gap for production (flagged in `docs/ARCHITECTURE_DECISIONS.md` §8).

---

## Not implemented (by deliberate scope decision, not oversight)

- A second backend for `mock-ssc-portal` — see `docs/ARCHITECTURE_DECISIONS.md` §8.
- Server-side `redirect_uri` allow-listing / a standards-compliant OAuth2 code-exchange flow.
- Credential verification via a real (even mock-issuer-simulated-server-side) workflow beyond `USER_PROVIDED` status on upload.
