# OTR-India — MVP

One-Time Registration and Interoperability Framework for Government Applications.
Smart India Hackathon — PS 26129.

> **Sept 2026 note:** this repository is a single-owner consolidation of the
> original 4-person `OTR-India` project. It reuses working foundation code
> from that project as a starting base, then integrates everything into one
> coherent, runnable prototype ahead of the SIH deadline. See
> `docs/ARCHITECTURE_DECISIONS.md` for what changed and why, including the
> Sept 4 change to a genuinely two-website architecture.

## What this demonstrates

OTR-India is **two separate websites that are actually connected**, not one
app with a portal page embedded inside it:

- **OTR-India** (`frontend/`, port `5173`) — the citizen's own site. Reusable
  profile, credentials, consent history, access tokens, applications.
- **GovRecruit-A / Mock SSC Portal** (`mock-ssc-portal/`, port `5174`) — a
  completely separate government examination portal, with its own visual
  identity, its own routing, and its own minimal client-side record-keeping.
  It has never seen OTR's source, database, or session.

A citizen creates a reusable OTR profile once. On GovRecruit-A, they click
**"Continue with OTR"** — a real, full-page, cross-site browser redirect to
`http://localhost:5173/authorize?client_id=...&redirect_uri=...`. OTR shows
exactly what GovRecruit-A is requesting, in plain language. On approval, OTR
issues a scoped, opaque access token and redirects the browser **back** to
GovRecruit-A with it. GovRecruit-A then calls OTR's public API directly,
cross-origin, to retrieve **only the authorized fields**, mapped into its own
field names (`candidate_name`, `dob`, `mobile_no`, ...) — never OTR's
canonical shape, never the whole profile.

**OTR is not autofill.** It never reaches into GovRecruit-A's form and types
values in — there is no shared page for it to reach into. GovRecruit-A calls
OTR's API itself and renders the result on its own site. The token is also
reusable: GovRecruit-A stores it (client-side, for this prototype) and calls
OTR again later — e.g. "Generate Admit Card" — without asking the citizen to
re-authorize, which is what makes this an interoperability layer rather than
a one-time handoff. See `docs/ARCHITECTURE_DECISIONS.md` for the full
reasoning.

## Structure

```
backend/            Express + TypeScript + Drizzle/Postgres — OTR's real API
frontend/            Vite + React + TypeScript — OTR's own citizen-facing site (port 5173)
mock-ssc-portal/     Vite + React + TypeScript — the standalone Mock SSC site (port 5174)
docs/                Architecture decisions, API contracts
```

`backend/` is the only backend. `mock-ssc-portal/` has no server of its
own — it calls `backend/`'s public endpoints directly from the browser,
exactly like a real external government portal integrating with OTR would.

## Running locally

You need three terminals (plus Postgres running).

```bash
# 0. Postgres running locally (see docs/ARCHITECTURE_DECISIONS.md for the
#    PostgreSQL 16 public-schema-permissions footgun if migrations fail
#    with "no schema selected to create in").

# 1. Backend (port 4000)
cd backend
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET
npm install
npx drizzle-kit migrate     # or apply drizzle/*.sql directly with psql
npm run dev

# 2. OTR-India frontend (port 5173) — in a new terminal
cd frontend
npm install
npm run dev

# 3. Mock SSC portal (port 5174) — in a new terminal
cd mock-ssc-portal
npm install
npm run dev
```

Then open **http://localhost:5174** (GovRecruit-A) — not 5173 — to start
the demo as a citizen would: from the government portal's own site.

`backend/.env`'s `CORS_ORIGIN` must include both `http://localhost:5173`
and `http://localhost:5174` (the `.env.example` default already does).

## Demo sequence

1. Open `http://localhost:5174` (GovRecruit-A). Click **Apply Now**.
2. Click **Continue with OTR** — the browser genuinely navigates to
   `localhost:5173`.
3. Register/log in on OTR (if not already), then land on the consent
   screen: "GovRecruit-A is requesting: ✓ Full Name ✓ DOB ✓ Mobile ...".
4. Click **Allow & Continue**. The browser is redirected back to
   `localhost:5174/callback`, then straight to the application form.
5. See "Applicant information retrieved securely from OTR-India" with the
   authorized fields — plus GovRecruit-A-specific fields (exam centre,
   post preference) that live only on GovRecruit-A.
6. Submit. Get a real application reference number
   (`APP-SSCEXAMPORTAL-2026-XXXX`).
7. From the application's detail page, click **Generate Admit Card** — this
   calls OTR again with the *same* token, no new consent screen, proving
   the authorization is durable.
8. Back on OTR-India's own **Dashboard**, see the application, the consent
   history entry, and the access token — all from OTR's side of the story.

## Status

See `PROJECT_STATUS.md`.
