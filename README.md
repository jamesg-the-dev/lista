# Hospo Roster

AU hospitality staff scheduling — award-compliant rostering for single and
multi-venue cafes/restaurants, built as a focused alternative to
Deputy/RosterElf for owner-operators who don't need enterprise workforce
management.

## Why this exists

Competitor research (Deputy, RosterElf, 7shifts, ClockOn, Microkeeper)
surfaced three recurring gaps:

1. Award interpretation errors get blamed on the payroll system rather than
   the roster tool — the calculation is a black box.
2. Pricing is structured for scale, not a 5–15 person single venue.
3. Support quality (especially AU award-law fluency) is tied to plan tier.

This product's wedge: transparent, visible award-rate math on every shift,
a flat low price for single-venue operators, and no enterprise features
(AI demand forecasting, multi-country rostering) nobody in a small cafe
asked for.

## Structure

```
frontend/    React + Vite + Tailwind — manager web app + staff app (PWA-style)
backend/     .NET Web API — CQRS/MediatR/DDD, EF Core targeting Postgres
```

## Stack decisions

- **Frontend:** React (latest) + Vite + TypeScript-ready + Tailwind CSS for
  layout/spacing utilities, custom CSS variables for the design token system
  (colors/fonts outside Tailwind's default palette).
- **Backend:** .NET, CQRS via MediatR, DDD-style aggregates, EF Core — same
  patterns as Pentana.RepairOrder.Service (audit interceptor via
  ISaveChangesInterceptor, domain events, pluggable strategy interfaces
  instead of hardcoded logic where a second variant is likely later).
- **Database:** Postgres, managed via Supabase. EF Core/Npgsql is the only
  writer (business logic, audit trail integrity stay server-side); Supabase
  Auth and Realtime are used for staff login and live roster/shift-swap
  push updates. See `backend/README.md` for the full rationale.
- **Award compliance:** MVP hardcodes the Hospitality Industry General
  Award (MA000009) behind `IAwardRateCalculator`, so a second award or an
  EBA-specific pay template can be added later without touching command
  handlers. Rates shown anywhere in the UI are illustrative until sourced
  from Fair Work's Pay Calculator or a licensed award-interpretation feed —
  **do not treat current rates as payroll-accurate.**

## Screens (build order)

- [x] 1. Roster builder (manager) — `frontend/src/components/roster/RosterBuilder.jsx`
- [ ] 2. Auth / venue selector
- [ ] 3. Staff list / profiles
- [ ] 4. Labour cost dashboard
- [ ] 5. Shift swap / approvals
- [ ] 6. Staff app: shift view
- [ ] 7. Staff app: clock in/out (GPS-verified)

## Getting started (frontend)

```bash
cd frontend
npm install
npm run dev
```

## Getting started (backend)

Backend is scaffolded but not yet buildable end-to-end (no `dotnet restore`
run in this environment). Open `backend/src` in Rider or VS, restore
NuGet packages, and point `appsettings.json`'s connection string at your
Supabase Postgres instance.
