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

## Reserved / not yet implemented

Per `backend/src/app.ts`, these mount points are reserved but not built —
don't build against them yet, they don't exist:

- `POST /api/consent`, related consent endpoints — Anchal
- `GET/POST /api/applications` — Anchal
- Interoperability/connector-facing endpoints — Harsh

When each lands, add its real contract to this file instead of a planned one.
