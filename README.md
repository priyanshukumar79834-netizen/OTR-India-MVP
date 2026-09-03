# OTR-India — MVP

One-Time Registration and Interoperability Framework for Government Applications.
Smart India Hackathon — PS 26129.

> **Sept 2026 note:** this repository is a single-owner consolidation of the
> original 4-person `OTR-India` project (Priyanshu/Harsh/Adi/Anchal). It
> reuses working foundation code from that repo and Adi's frontend work as a
> starting base, then integrates everything into one coherent, runnable
> prototype ahead of the SIH deadline. See `docs/ARCHITECTURE_DECISIONS.md`
> for what changed and why.

## What this demonstrates

A citizen creates a reusable OTR profile once, then authorizes specific
government portals (mock `SSC_EXAM_PORTAL`, `SCHOLARSHIP_PORTAL`) to access
**only the fields they consent to** — never the whole profile. OTR issues
each portal an opaque, revocable access token; the portal presents that
token to retrieve data, mapped into its own field names, on demand — including
later, independent of the citizen's original session (e.g. admit-card
generation).

**OTR is not autofill.** It does not reach into a portal's form and type
values in. The portal calls OTR; OTR returns authorized data; the portal is
responsible for its own form/service. See `docs/ARCHITECTURE_DECISIONS.md`
for the full reasoning and the exact wording this project commits to.

## Structure

```
backend/   Express + TypeScript + Drizzle/Postgres — the real API
frontend/  Vite + React + TypeScript — citizen-facing OTR UI + mock portal views
docs/      Architecture decisions, API contracts
```

## Running locally

```
# 1. Postgres running locally, then:
cd backend
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET
npm install
npx drizzle-kit migrate   # or apply drizzle/*.sql directly with psql
npm run dev

# 2. In another terminal:
cd frontend
npm install
npm run dev
```

## Status

See `PROJECT_STATUS.md`.
