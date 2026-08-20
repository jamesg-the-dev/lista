# Hospo Roster — Backend API Build Guide

Companion to the project context doc. This lays out the backend build in the
same phase order as the screens (Budget → Roster → Publish → Actual →
Reconciled → Export), translated into aggregates, MediatR commands/queries,
and **controllers**.

Trim to just the remaining phases if Screens 1–3's backend is already built.

---

## Phase 0 — Tenancy, auth, and pipeline skeleton

Everything else depends on this being right first.

- **Aggregates:** `Organisation` (root), `Venue` (child, `OrganisationId` FK).
  Staff/shifts/rosters all carry `VenueId`.
- **Tenant scoping:** a MediatR pipeline behavior
  (`TenantScopingBehavior<TRequest, TResponse>`) that reads the current
  tenant/venue from a scoped `ICurrentTenantContext` (populated from the JWT
  + venue header on the request) and either injects it into the request or
  throws if the request's `VenueId` doesn't belong to the authenticated org.
  Runs **first** in the pipeline per the locked order:
  tenant-scoping → authorization → audit → validation.
- **Auth:** validate Supabase Auth JWTs in ASP.NET Core auth middleware; map
  Supabase user id → internal `Staff`/`Manager` record via a claims
  transformer.
- **Audit interceptor:** implement `ISaveChangesInterceptor` now, even with
  no aggregates raising events yet — wire it into the EF Core `DbContext` so
  every subsequent aggregate just needs to raise domain events.

### `AccountController`

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/account/me` | Resolve current Supabase user → internal identity + accessible venues. Smoke test for the whole pipeline. |

---

## Phase 1 — Roster builder core (Screen 1)

- **Aggregates:** `Shift` (root) — id, `VenueId`, staff assignment,
  start/end (UTC), status (`Draft/Published/Confirmed/Cancelled`),
  collection of `AwardBreakdownLine` value objects, collection of
  `ComplianceViolation` value objects. Raise a `ShiftCreated`/`ShiftUpdated`
  domain event now so the audit interceptor has something to catch from day
  one.
- **`IAwardRateCalculator`:** define now even though MVP has one
  implementation (`HospitalityGeneralAwardRateCalculator`, MA000009 only —
  ordinary hours, Sat +25%, Sun +50%, weekday evening +10%). Returns
  itemised `AwardBreakdownLine[]`, never a single total.
- **Commands:** `CreateShiftCommand`, `UpdateShiftCommand`,
  `DeleteShiftCommand` — each runs the award calculator inside the handler.
- **Queries:** `GetRosterForWeekQuery(VenueId, WeekStart)` → `ShiftDto[]`
  with itemised `awardBreakdown`.

### `RosterController`

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/roster?weekStart=` | `GetRosterForWeekQuery` |
| POST | `/api/shifts` | `CreateShiftCommand` |
| PUT | `/api/shifts/{id}` | `UpdateShiftCommand` |
| DELETE | `/api/shifts/{id}` | `DeleteShiftCommand` |

Drag-and-drop is a frontend-only gap — no backend implication.

---

## Phase 2 — Staff profiles + availability/leave (Screen 2)

- **Aggregates:** `StaffMember` (pay tier/classification, employment type,
  max weekly hours), `Unavailability` (standing weekly pattern),
  `LeaveRequest` (one-off, with approval state).
- Wire `StaffMember.Classification` / `EmploymentType` into
  `IAwardRateCalculator` now if Phase 1 stubbed them.
- **Commands:** `CreateStaffMemberCommand`, `UpdateStaffMemberCommand`,
  `SubmitLeaveRequestCommand`, `ApproveLeaveRequestCommand`,
  `SetStandingUnavailabilityCommand`.
- **Queries:** `GetStaffForVenueQuery`,
  `GetStaffAvailabilityQuery(StaffId, DateRange)`. Validate double-booking
  server-side too, inside `CreateShiftCommand`/`UpdateShiftCommand` — don't
  rely on the client alone.

### `StaffController`

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/staff` | `GetStaffForVenueQuery` |
| POST | `/api/venues/{venueId}/staff` | `CreateStaffMemberCommand` |
| PUT | `/api/staff/{id}` | `UpdateStaffMemberCommand` |
| GET | `/api/staff/{id}/availability?from=&to=` | `GetStaffAvailabilityQuery` |
| POST | `/api/staff/{id}/unavailability` | `SetStandingUnavailabilityCommand` |

### `LeaveRequestController`

| Method | Route | MediatR request |
|---|---|---|
| POST | `/api/staff/{id}/leave-requests` | `SubmitLeaveRequestCommand` |
| POST | `/api/leave-requests/{id}/approve` | `ApproveLeaveRequestCommand` |

---

## Phase 3 — Roster builder enhancements (Screen 3)

Three sub-features, mostly independent backend work.

### Live labour budget bar
- No new aggregate — aggregation over Phase 1 data. Add
  `Venue.ForecastSalesTarget` (weekly, editable) and
  `GetBudgetSummaryQuery(VenueId, WeekStart)` returning
  `{ totalCost, forecastSalesTarget, percentOfTarget }`, summed off existing
  `AwardBreakdownLine`s.

### Inline compliance warnings
- Implement `IRosterComplianceValidator` exactly as specced — pure
  function, `(Shift proposedShift, IReadOnlyList<Shift> staffMemberContext, CancellationToken)`
  → `IReadOnlyList<ComplianceViolation>`. The command handler fetches the
  staff member's adjacent shifts before calling it; the validator has no
  repository dependency.
- `HospitalityGeneralAwardComplianceValidator` implements
  `InsufficientRest`, `MissingBreak`, `SpanOfHoursExceeded`,
  `MaxConsecutiveDays`. All `Warning` severity to start; promote to
  `Blocking` only when confirmed flatly illegal to publish.
- Runs in the validation pipeline stage but **attaches** violations to the
  response rather than throwing — don't reuse `ValidationException`.
- **Override flow:** `OverrideComplianceViolationCommand(ShiftId, ViolationType, Reason)`
  writes an audit-logged override record and flips the violation to
  "acknowledged" rather than deleting it.
- Extend shift responses to include `complianceViolations: ComplianceViolationDto[]`.

### Copy-previous-week
- `DuplicateRosterCommand(VenueId, SourceWeekStart, TargetWeekStart)` —
  clones shifts (not staff/availability) as new `Draft` shifts, re-running
  the award calculator and compliance validator against the new dates.

### `RosterController` (additions)

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/roster/budget-summary?weekStart=` | `GetBudgetSummaryQuery` |
| POST | `/api/venues/{venueId}/roster/duplicate` | `DuplicateRosterCommand` |

### `ComplianceController`

| Method | Route | MediatR request |
|---|---|---|
| POST | `/api/shifts/{id}/compliance-violations/{violationType}/override` | `OverrideComplianceViolationCommand` |

---

## Phase 4 — Labour cost dashboard

- No new domain writes — purely reporting queries over Phase 1–3 data.
- **Queries:** `GetCostTrendQuery(VenueId, DateRange)`,
  `GetCostByRoleQuery(VenueId, WeekStart)`,
  `GetCostByVenueQuery(OrganisationId, WeekStart)`.
- Leave forecast-vs-actual as an explicit stub
  (`actualCost: null` / `IsActualAvailable`) until Phase 6 — don't backfill
  with fake data.

### `LabourCostController`

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/labour-cost/trend?from=&to=` | `GetCostTrendQuery` |
| GET | `/api/venues/{venueId}/labour-cost/by-role?weekStart=` | `GetCostByRoleQuery` |
| GET | `/api/organisations/{orgId}/labour-cost/by-venue?weekStart=` | `GetCostByVenueQuery` |

---

## Phase 5 — Staff app: shift view + swap requests

- **Aggregate:** `SwapRequest` (root) — `ShiftId`, `RequestingStaffId`,
  `TargetStaffId` (nullable if open), status
  (`Pending/Approved/Rejected/Cancelled`), reason.
- **Commands:** `RequestSwapCommand`, `RespondToSwapCommand` (target staff
  accept/decline), `ApproveSwapCommand`/`RejectSwapCommand` (manager). On
  approval, reassign the `Shift` and re-run both `IAwardRateCalculator` and
  `IRosterComplianceValidator` — a swap can silently create a rest-hours
  breach.
- **Queries:** `GetMyShiftsQuery(StaffId)`,
  `GetPendingSwapsForVenueQuery(VenueId)` (manager inbox).
- **Realtime:** raise domain events on swap create/approve/reject and push
  via Supabase Realtime so the manager inbox and staff shift view update
  live.

### `StaffShiftsController`

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/staff/me/shifts` | `GetMyShiftsQuery` |
| POST | `/api/shifts/{id}/swap-requests` | `RequestSwapCommand` |
| POST | `/api/swap-requests/{id}/respond` | `RespondToSwapCommand` |

### `SwapRequestController` (manager-facing)

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/swap-requests?status=pending` | `GetPendingSwapsForVenueQuery` |
| POST | `/api/swap-requests/{id}/approve` | `ApproveSwapCommand` |
| POST | `/api/swap-requests/{id}/reject` | `RejectSwapCommand` |

---

## Phase 6 — Clock in/out + rostered-vs-actual variance

- **Aggregate:** `TimeEntry` (root) — `ShiftId`, `StaffId`,
  `ClockInUtc`/`ClockOutUtc`, GPS coordinates + accuracy at each event,
  `VarianceStatus` (`WithinTolerance/Flagged/Approved`).
- Build the variance comparison **inside the clock-out command**, not as a
  follow-up: compute `actualMinutes - rosteredMinutes`, apply a tolerance
  threshold, set `Flagged` if outside tolerance.
- **Commands:** `ClockInCommand(ShiftId, Lat, Lng)`,
  `ClockOutCommand(TimeEntryId, Lat, Lng)`,
  `ApproveTimeEntryCommand`/`AdjustTimeEntryCommand` (manager resolves a
  flagged entry before hours lock).
- **Queries:** `GetFlaggedTimeEntriesQuery(VenueId)`,
  `GetActualVsRosteredQuery(VenueId, WeekStart)` — unblocks the Phase 4
  dashboard stub.

### `TimeClockController`

| Method | Route | MediatR request |
|---|---|---|
| POST | `/api/shifts/{id}/clock-in` | `ClockInCommand` |
| POST | `/api/time-entries/{id}/clock-out` | `ClockOutCommand` |

### `TimesheetController` (manager-facing)

| Method | Route | MediatR request |
|---|---|---|
| GET | `/api/venues/{venueId}/time-entries/flagged` | `GetFlaggedTimeEntriesQuery` |
| GET | `/api/venues/{venueId}/time-entries/variance?weekStart=` | `GetActualVsRosteredQuery` |
| POST | `/api/time-entries/{id}/approve` | `ApproveTimeEntryCommand` |
| POST | `/api/time-entries/{id}/adjust` | `AdjustTimeEntryCommand` |

---

## Phase 7 — Payroll export

- No new aggregate beyond ensuring `TimeEntry`/`Shift`/`AwardBreakdownLine`
  carry export-ready fields (pay code, loading type) — retrofit onto
  Phase 1/6 models now if left generic.
- **Command:** `GeneratePayrollExportCommand(VenueId, PayPeriod)` — reads
  only `Approved`/locked `TimeEntry` records, groups by staff + pay code,
  produces the Xero/MYOB-shaped CSV. Treat as a command, not a plain query
  — an export is effectively "hours submitted for payment" and should be
  audit-logged even though it doesn't mutate roster data.

### `PayrollExportController`

| Method | Route | MediatR request |
|---|---|---|
| POST | `/api/venues/{venueId}/payroll-exports` | `GeneratePayrollExportCommand` — returns a file/download URL |
| GET | `/api/venues/{venueId}/payroll-exports` | `GetPayrollExportHistoryQuery` (audit trail of past exports) |

---

## Open decisions to pin down before Phase 0

The project doc doesn't lock these in — worth deciding once so they don't
get relitigated later, same as the other architecture calls in that doc:

- **Controller base:** a shared `ApiControllerBase` with a protected
  `_mediator` (or `ISender`) field, `[ApiController]`, and a consistent
  route prefix (`api/[controller]`) — keeps every controller a thin
  pass-through to MediatR, no logic in the controller itself.
- **Validation library:** FluentValidation is the common MediatR pairing
  for the pipeline's validation stage. Worth confirming since
  `IRosterComplianceValidator` sits in that same stage but with different
  semantics (attach violations, don't throw) — the two shouldn't be
  conflated.
- **Response envelope:** whether all endpoints return a consistent wrapper
  (e.g. `ApiResponse<T>`) or raw DTOs with problem-details for errors.


## Prompt
begin phase N in @docs/backend-step-by-step.md  . Remember to read @CLAUDE.md  for context and use /supabase-postgres-best-practices  skill when designing and implementing the APIs