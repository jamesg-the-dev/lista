# Hospo Roster — Project Context

Read this before making changes. It captures decisions already made so they
don't get relitigated or silently drifted from.

## What this is

AU hospitality staff scheduling app — award-compliant rostering for
single/multi-venue cafes and restaurants. Positioned against Deputy,
RosterElf, and 7shifts as a focused, cheaper alternative for owner-operators
(5–15 staff, single or few venues) who don't need enterprise workforce
management.

## Why it exists (don't lose this in feature work)

Competitor research surfaced three gaps this product exists to close:

1. **Award interpretation is a black box.** Errors get blamed on the payroll
   system downstream rather than surfaced clearly by the roster tool.
2. **Pricing scales for enterprise, not a single small venue.**
3. **Support/compliance depth is tied to plan tier.**

The differentiator is **visible, transparent award-rate math on every
shift** — not a hidden calculation. Any UI or API work touching pay/cost
should preserve that transparency (e.g. the receipt-style breakdown panel
on the shift editor). Don't collapse it into a single opaque number.

### Who is actually paying for this, and why

A 5–15 staff venue owner-operator doesn't buy rostering software because
rostering is hard — they buy it because one of three things is bleeding
them, and every feature decision below should trace back to one of these:

1. **Labour cost is eating margin and they find out too late** — after the
   week's trading, when the P&L lands, not while they still have a chance
   to act.
2. **Fear of underpaying someone.** Fair Work enforcement and "wage theft"
   media coverage have made this existential for small hospo owners, not
   theoretical. A single miscalculated shift is a reputational and legal
   risk, not just an accounting correction.
3. **Unpaid admin time.** Building the roster, chasing swaps, doing
   timesheets, reconciling to payroll — hours the owner resents and would
   pay to remove.

The MVP is built as **one connected loop**, not a set of isolated screens:

```text
Budget → Roster → Publish → Actual hours worked → Reconciled cost → Payroll export
```

Every screen below is a stage in that loop. A feature that doesn't sit on
this loop (or directly protect problem #2, compliance) is a nice-to-have,
not an MVP candidate — defer it rather than diluting build focus.

### Feature rationale (why each MVP feature exists)

This is the detailed "why," kept next to the build order below so the two
don't drift apart. When in doubt about scope, re-read the "helps the
business because" line before adding or cutting anything.

* **Staff profiles + availability/leave capture.**
  *What:* pay tier/classification, employment type (casual/PT/FT), max
  weekly hours, standing unavailability, one-off leave requests.
  *Helps the business because:* this is the prerequisite data every other
  feature needs — the roster builder can't stop a manager double-booking
  someone on leave without it, and `IAwardRateCalculator` can't price a
  shift correctly without knowing employment type. Shipping the builder
  without this is shipping a tool that still allows the exact rostering
  mistakes it's meant to prevent.

* **Live labour budget bar (inside the roster builder, not a separate
  screen).**
  *What:* a running $ total (and ideally % of a forecast-sales target) as
  shifts are added to the grid, colour-coded under/near/over budget.
  *Helps the business because:* this directly targets problem #1
  (cost discovered too late). A dashboard checked after publishing is a
  report card; a live total the manager sees while dragging shifts in is a
  decision-making tool. It reuses the award-breakdown data already
  computed for the shift-level receipt panel, so it's a UI/aggregation
  feature, not a new pricing engine.

* **Inline compliance warnings (pluggable validator — see below).**
  *What:* insufficient rest between shifts, missing break, span-of-hours
  breach, max consecutive days — surfaced as warning badges on the
  affected shift as it's built, not just at publish time.
  *Helps the business because:* this directly targets problem #2. Pay-rate
  transparency alone doesn't stop a manager creating a roster that's
  correctly priced but still illegal (e.g. closing at 11pm, opening the
  same person at 6am). This is also genuinely differentiated — competitor
  tools handle AU award compliance shallowly at best.

* **Shift templates / copy-previous-week.**
  *What:* duplicate a prior week's roster as a starting point instead of
  building from a blank grid.
  *Helps the business because:* most venues run a repeating pattern with
  small weekly tweaks. This is a top-requested feature in hospo rostering
  tool reviews generally, and skipping it means every manager rebuilds
  from scratch every week — that's an admin-time cost (problem #3) severe
  enough to threaten weekly retention of the tool itself, independent of
  whether the compliance/budget features are good.

* **Labour cost dashboard.**
  *What:* week-over-week cost trend, cost by role/venue, forecast vs
  actual once actuals exist from clock-in data.
  *Helps the business because:* once the budget bar exists inside the
  builder, this becomes a genuine reporting layer on top of live data
  already being captured, rather than the primary (and too-late) way an
  owner learns their labour cost. Sequenced after the budget bar
  deliberately — a dashboard with nothing feeding it in real time is a
  static report, not a differentiator.

* **Staff app: shift view + swap requests.**
  *What:* staff-side shift visibility, availability/swap requests, with
  manager-side approval handled as an inbox rather than a separate screen.
  *Helps the business because:* reduces the phone-call/group-chat admin
  loop (problem #3) around who's covering what, and keeps swap history
  auditable instead of happening off-platform where it can silently
  create compliance or cost problems (e.g. a swap that breaches rest
  hours going unnoticed).

* **Clock in/out (GPS-verified) + rostered-vs-actual variance.**
  *What:* GPS-verified clock in/out, paired with a comparison against the
  rostered shift and a flag for discrepancies (e.g. "worked 47 minutes
  over rostered — approve or flag") before hours are locked.
  *Helps the business because:* clock-in/out alone is a commodity — every
  competitor has it. The variance comparison is what makes it valuable:
  it's the wage-compliance safety net (problem #2) and the actual-cost
  input the labour dashboard needs to stop being a forecast and start
  being a reconciliation. Build the comparison as a first-class part of
  this feature, not an afterthought bolted on later.

* **Payroll export.**
  *What:* CSV export shaped for Xero/MYOB (employee, pay code, hours,
  loading type) generated from approved/locked timesheet data.
  *Helps the business because:* this is the commercial payoff of the
  entire loop — the last-mile pain every owner currently pays a
  bookkeeper to solve manually by re-keying hours. It's also one of the
  most concrete, demoable reasons a venue would switch tools and pay for
  this one. Deliberately pulled forward in priority (previously deferred
  post-MVP) — a rough CSV export is closer to the money than clock-in/out
  is on its own, and doesn't require a live accounting API integration to
  ship real value.

## Repo structure — monorepo, intentionally

```text
frontend/   React + Vite + React Router Framework Mode + Tailwind
backend/    .NET — CQRS/MediatR/DDD, EF Core → Postgres (Supabase-managed)
```

Kept as a monorepo because it's a solo project with tightly coupled
frontend/backend schema changes. Revisit only if a second contributor joins
who works exclusively on one side, or if CI times become a real problem
(fix with path-filtered CI triggers first, before considering a split).

## Frontend architecture and folder structure

The frontend uses **React Router Framework Mode**. This is an explicit
architectural decision.

Do **not** use React Router Data Mode with `createBrowserRouter` /
`RouterProvider` as the application's routing architecture. Do not introduce
a separate `src/pages` routing tree or revert to a `frontend/src/components/<domain>`
screen structure.

React Router Framework Mode owns the route structure. Route modules live
under `frontend/app/routes/`, and `frontend/app/routes.ts` defines the
application's route configuration.

The frontend uses the following structure:

```text
frontend/
├── app/
│   ├── routes/
│   │   ├── _index/
│   │   │   └── route.tsx
│   │   │
│   │   ├── roster/
│   │   │   ├── route.tsx
│   │   │   ├── components/
│   │   │   │   └── RosterBuilder.tsx
│   │   │   ├── types.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── store.ts
│   │   │
│   │   └── staff/
│   │       ├── route.tsx
│   │       ├── components/
│   │       ├── types.ts
│   │       ├── api.ts
│   │       └── hooks.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   │
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   │
│   ├── layouts/
│   │   └── AppLayout.tsx
│   │
│   ├── lib/
│   │   └── api-client.ts
│   │
│   ├── types/
│   │   └── pagination.ts
│   │
│   ├── root.tsx
│   └── routes.ts
│
├── public/
├── package.json
├── vite.config.ts
└── ...
```

### Route ownership

Each route owns the code specific to that route.

For example:

```text
frontend/app/routes/roster/
├── route.tsx
├── components/
│   └── RosterBuilder.tsx
├── types.ts
├── api.ts
├── hooks.ts
└── store.ts
```

`route.tsx` is the React Router route module and is responsible for the
route-level concerns such as the route component, loader, action, error
boundary, or other React Router route-module APIs where required.

The supporting files belong beside the route because they are specific to
that feature.

Do not move route-specific code into global directories simply to make the
root folder structure look cleaner.

If a component, hook, type, or utility is genuinely needed by multiple
unrelated routes, it can be promoted to an appropriate shared location.

### Global components

`frontend/app/components/ui/` contains **shadcn/ui primitives only**.

These are source files generated by the shadcn CLI and owned by this
repository. They are built on **Base UI**, not Radix UI.

Examples:

```text
frontend/app/components/ui/
├── button.tsx
├── input.tsx
├── select.tsx
├── dialog.tsx
└── ...
```

Do not put application-specific data fetching, Zustand stores, route logic,
or domain-specific business logic into `components/ui/`.

`frontend/app/components/shared/` contains genuinely reusable application
components that are used across multiple routes.

Examples:

```text
frontend/app/components/shared/
├── Navbar.tsx
├── Sidebar.tsx
├── PageHeader.tsx
└── ...
```

A component should not be placed in `shared/` merely because it is reusable
within one feature. Keep it beside the route that owns it until there is a
real cross-route need.

### Layouts

Application-wide layouts live in:

```text
frontend/app/layouts/
```

For example:

```text
frontend/app/layouts/AppLayout.tsx
```

Layouts should handle structural UI such as navigation, sidebars, headers,
and route outlets. They should not become a dumping ground for feature
logic.

### Shared frontend infrastructure

Truly cross-cutting infrastructure belongs in:

```text
frontend/app/lib/
frontend/app/types/
```

For example:

```text
frontend/app/lib/
  api-client.ts

frontend/app/types/
  pagination.ts
```

Do not create global `api.ts`, `hooks.ts`, or `store.ts` files for individual
features. Feature-specific data access and state belong inside the relevant
route directory.

## Stack decisions

* **Frontend:** React 19+ (minimum) with the react-jsx runtime, **React Router
  Framework Mode**, Vite as the build tool (kept on the highest major version
  that's compatible with React 19), and Tailwind CSS 4+ (minimum). This is a
  green-field project — don't downgrade any of these to chase a
  familiar-but-older setup, and don't add a `tailwind.config.js`; Tailwind 4
  is configured via the `@tailwindcss/vite` plugin and an
  `@import "tailwindcss";` in CSS, no config file needed. Tailwind handles
  layout/spacing/flex/grid utilities; custom design tokens (colors, fonts)
  live as CSS variables because they fall outside Tailwind's default palette.
  See `docs/design-system.md`.

  * **React Router:** Use **Framework Mode**, not Data Mode or Declarative
    Mode. React Router's Framework Mode is the application's routing
    architecture and should remain the source of truth for route definitions.
    Route modules live under `frontend/app/routes/`, with route configuration
    in `frontend/app/routes.ts`.
  * Use React Router Framework Mode APIs such as route `loader`, `action`,
    `Component`, `ErrorBoundary`, and related route-module APIs where
    appropriate.
  * Do not create a `createBrowserRouter()` / `RouterProvider` application
    setup.
  * Do not introduce a separate `src/pages/` directory for route pages.
  * Do not introduce a parallel `frontend/src/components/<domain>/`
    architecture. Domain/screen-specific frontend code belongs under the
    corresponding `frontend/app/routes/<route>/` directory.
  * Do not add React Router Framework Mode dependencies or APIs to a
    Data Mode project — this project is explicitly being built as a
    Framework Mode project from the start.

* **Language:** All React code is TypeScript — `.tsx`/`.ts` only, never
  `.jsx`/`.js`. `strict` mode is on in `tsconfig.app.json`; don't weaken it
  or reach for `any`/non-null assertions to silence the compiler. Prefer
  explicit types on component props and function signatures, discriminated
  unions over loosely-shaped objects, and narrowing (guard clauses, small
  "must find or throw" helpers) over optional chaining sprinkled at every
  call site.

* **How to write UI code:** think like a senior React developer — compose
  small typed components, keep state colocated with where it's used, lift
  it only when something genuinely needs to share it, and don't reach for
  patterns (context, reducers, extra abstraction layers) before the
  component actually needs them. See § State management & data layer below
  for how server data, cross-cutting client state, and local state are
  each handled — don't default to Context or a single global store.

* **Forms: TanStack Form for complicated forms, `useState` otherwise.**
  `@tanstack/react-form` is the standard once a form crosses the
  complexity bar defined in § State management & data layer → §4 Forms
  below — don't default to it for a single input, switch, or checkbox.

* **Component layer: shadcn/ui.** Chosen over a fully-styled library (MUI,
  Ant Design) because those fight a custom design system — every component
  ships its own opinionated look and you spend more effort overriding it
  than building with it. shadcn's copy-paste model instead drops component
  *source* into the repo (`frontend/app/components/ui/`), so we own that
  code directly and restyle every primitive with our own design tokens
  (see `docs/design-system.md`) instead of fighting someone else's theme.
  Screen-level components stay separate under their owning route in
  `frontend/app/routes/<route>/components/` — `components/ui/` is the
  primitive layer only, never screen-specific logic.

  It is imperative that the agent searches for a shadcn component first
  before it considers generating it's own custom html. If it does believe
  generating custom html is the appropriate option, then it must consult
  with the prompter first.

  * Built on **Base UI**, not Radix — Base UI is the actively-maintained
    primitive layer; Radix has slowed since its acquisition. Don't add
    Radix-based components alongside it.
  * Style preset: **Vega** (`base-vega` in `components.json`). The CLI's
    old "new-york"/"default" style choice has been retired in favour of
    eight named presets (Nova, Vega, Maia, Lyra, Mira, Luma, Sera, Rhea);
    Mira was picked as the current one. Don't mix presets — re-running
    `init` with a different `-p` value would fight this choice.
  * Tokens: shadcn's semantic CSS variables (`--background`, `--primary`,
    `--card`, etc., in `frontend/app/index.css`) use shadcn's own default
    neutral (zero-chroma) dark palette, deliberately — see
    `docs/design-system.md` § Color philosophy. Color is reserved for
    signal (role identity, over-budget/destructive state); there is no
    branded "accent" color anymore. Route-level UI consumes these global
    tokens directly rather than keeping its own local copies.
  * Light is the default theme: `index.css` sets shadcn's stock light
    palette on bare `:root`, with a full dark palette in a `.dark` block
    driven by the `@custom-variant dark (&:is(.dark *))` declared at the
    top of the file. Add `.dark` to `<html>` to opt into dark.
    `--destructive` and `--success` (the two functional signal colors,
    alongside role identity — see `docs/design-system.md` § Color philosophy)
    keep the same custom hex in both themes rather than shadcn's per-theme
    default, since they're signal colors, not chrome.
  * Never use inline `style={{ }}` with `var(--token)` for colors,
    backgrounds, or borders. Every semantic color token is registered in
    `@theme` (`frontend/app/app.css`) and must be used as a Tailwind
    utility class (e.g. `bg-card`, `text-muted-foreground`,
    `border-border`). Inline styles are reserved for genuinely
    dynamic/computed values that can't be expressed as a static class
    (e.g. a chart bar's pixel height, a percentage width) — see
    `docs/design-system.md` § Inline styles vs Tailwind utilities.

* **How to write backend code:** think like a senior .NET developer —
  favour these conventions (CQRS/MediatR, DDD aggregates, async all the way
  down, pluggable interfaces where a second variant is plausible) rather
  than ad hoc controller logic.

* **Backend:** .NET, CQRS via MediatR, DDD aggregates, EF Core.

  * Append-only audit trail via `ISaveChangesInterceptor`, driven by domain
    events raised on aggregates (see `Shift.cs` — events are TODO but the
    aggregate shape assumes this).
  * MediatR pipeline behaviors in this order: tenant-scoping →
    authorization → audit → validation. See "Authorization & permission
    policy (backend)" below for what the authorization stage actually
    enforces and does not.
  * Prefer pluggable interfaces over hardcoded logic wherever a second
    variant is plausible later (see `IAwardRateCalculator` — MVP has one
    implementation, but a second award/EBA pay template will need to slot
    in without touching command handlers).
  * **Pay-rate math and legality checks are two separate pluggable
    concerns — do not merge them.** `IAwardRateCalculator` answers "what
    does this shift cost." `IRosterComplianceValidator` (new — see below)
    answers "is this shift legal." They have different failure modes (one
    returns a dollar figure, the other returns a set of violations) and
    don't change in lockstep even within the same award, so keep them as
    separate interfaces with separate implementations.

    ```csharp
    public interface IRosterComplianceValidator
    {
        Task<IReadOnlyList<ComplianceViolation>> ValidateAsync(
            Shift proposedShift,
            IReadOnlyList<Shift> staffMemberContext, // adjacent shifts for the same employee — needed for rest-between-shifts checks
            CancellationToken ct);
    }

    public record ComplianceViolation(
        ComplianceViolationType Type,   // InsufficientRest, MissingBreak, SpanOfHoursExceeded, MaxConsecutiveDays, etc.
        ComplianceSeverity Severity,    // Warning vs Blocking
        string Message);
    ```

    Decisions locked in for this validator:

    * **Takes shift context, not just the single shift.** Rest-between-
      shifts and max-consecutive-days checks need the employee's adjacent
      shifts across the week, not just the shift being edited. The
      command handler fetches this window and passes it in — the
      validator itself stays a pure function, easy to unit test, and
      doesn't own a repository dependency.
    * **Warning by default, not blocking.** Hard-blocking shift creation
      makes the tool adversarial the moment a manager hits a genuine edge
      case. Violations surface in the UI as warnings with an
      audit-logged manager override reason. Escalate a specific rule to
      Blocking severity only when it's flatly illegal to publish — don't
      assume any rule needs this by default; confirm case by case.
    * **Runs in the MediatR validation pipeline stage** (same position as
      today — tenant-scoping → authorization → audit → validation), but
      attaches violations to the response rather than throwing. A
      `ValidationException` model fits "reject the command outright," not
      "warn the manager, let them override with a reason," so don't reuse
      that exception path for compliance violations.
    * Same pluggable intent as `IAwardRateCalculator`: one
      `HospitalityGeneralAwardComplianceValidator` implementation for
      MVP (MA000009 rules only), same "second implementation slots in
      later" shape.

* **Wire format for enums: exact member name string, never an int.** Every
  enum that crosses the API boundary — on a response DTO or on an inbound
  command/request — is serialized as its exact C# enum member name (e.g.
  `"Draft"`, `"InsufficientRest"`, `"Casual"`), matching how the value is
  stored in Postgres (every enum column uses `.HasConversion<string>()` in
  its `IEntityTypeConfiguration`). This was decided after `ShiftDto`
  (Rostering) briefly diverged from `StaffMemberDto` (Staffing) by using
  ints — the two were reconciled onto strings, once and for all, so this
  isn't a decision to relitigate per DTO:

  * **Outbound (DTO):** the DTO property is `string`; the mapping function
    calls `.ToString()` on the domain enum (e.g. `shift.Status.ToString()`).
  * **Inbound (command/request):** the command record takes `string`, not
    the domain enum type and not an int — binding straight to the enum
    type would silently accept a numeric string, and an int would drift
    from the DB's string storage. A FluentValidation rule checks the value
    against `EnumWireValidation.IsDefinedName<TEnum>()`
    (`RosterApp.Application/Common/EnumWireValidation.cs`) — exact,
    case-sensitive membership against `Enum.GetNames<TEnum>()`, which is
    the deliberately safe alternative to `Enum.TryParse`/`Enum.IsDefined`
    (both of which accept unnamed numeric values, e.g. `"999"`). A failed
    check throws `FluentValidation.ValidationException`, which the
    pipeline's `ValidationBehavior` + `ApiExceptionHandler` already turn
    into a 400 with a field-level error — no bespoke error handling
    needed. The handler then converts with `Enum.Parse<TEnum>(request.Field)`.
  * Route segments that carry an enum value (e.g.
    `/api/shifts/{id}/compliance-violations/{violationType}/override`) bind
    as a plain `string` route parameter, validated the same way inside the
    command — not as the enum type and not with a numeric route constraint.

* **Database:** Postgres via Supabase.

  * EF Core/Npgsql is the **only writer**. Business logic and audit
    integrity stay server-side in the .NET API — the frontend does not
    call Supabase directly for anything that mutates data.
  * Supabase Auth handles manager/staff login.
  * Supabase Realtime is used for live push (shift swap requests, roster
    changes reaching the staff app) — this is a genuine feature fit, not
    just infra convenience.
  * Postgres RLS can be layered in as defense-in-depth on top of
    MediatR-level tenant scoping, not instead of it.

* **Tenancy:** Multi-venue from day one. `Organisation` owns multiple
  `Venue`s; staff are assigned to one or more venues; managers switch venue
  context (see the venue switcher in the roster builder).

* **Award compliance (MVP):** Hospitality Industry General Award
  (MA000009) only, hardcoded behind `IAwardRateCalculator`. Current rules
  implemented: ordinary hours, Saturday +25%, Sunday +50%, weekday evening
  (after 7pm) +10%. **These figures are illustrative for UI/architecture
  purposes only — not sourced from Fair Work's Pay Calculator or verified
  against a licensed award-interpretation feed.** Do not ship real payroll
  calculations against this logic without that verification step. The
  same disclaimer applies to `IRosterComplianceValidator`'s rule set once
  specified (rest breaks, span of hours, max consecutive days) — treat
  those figures as illustrative/needs-verification too, not as sourced
  legal advice, until independently confirmed.

* **Payroll integration:** No live accounting API integration in MVP, but
  a payroll-shaped CSV export (see build order below) ships in MVP —
  domain models carry export-ready fields (pay codes, cost records) so a
  later Xero/MYOB API integration is additive, not a retrofit.

* **TODO: backend test coverage is thin outside the domain layer.**
  `RosterApp.Domain.Tests` has decent coverage of aggregates/value objects,
  and `RosterApp.Application.Tests` currently only covers the
  permission-policy mechanism (`PermissionPolicyCoverageTests`,
  `AuthorizationBehaviorTests`) — command/query handlers themselves
  (validators, the actual `Handle` logic per command) have no unit tests
  yet, and there are no integration tests exercising `RosterApp.Api`
  end-to-end (real HTTP requests through the full MediatR pipeline against
  a test database). Build both out: handler-level unit tests per command/
  query in `RosterApp.Application.Tests`, and API-level integration tests
  (e.g. `WebApplicationFactory`-style, against Testcontainers/a local
  Postgres) covering auth, tenant-scoping, and the new permission policy
  actually rejecting/allowing requests over the wire — not just at the
  pipeline-behavior unit-test level.

## Authorization & permission policy (backend)

### `Role` and `PermissionLevel` are unrelated concepts — never conflate them

English uses "role" for both, but in this codebase they don't overlap at
all:

* **`Role`** (`RosterApp.Domain.Staffing.Role`) is a venue-scoped,
  owner-created **job/position label** — "Bartender", "Head Chef" — mapped
  to a pay award classification via `RoleAwardMapping`. It carries zero
  access-control data. `CreateRoleCommand`/`DeactivateRoleCommand`/
  `SetRoleAwardMappingCommand` and `RoleController` are entirely about this
  job-classification concept.
* **`PermissionLevel`** (`RosterApp.Domain.Staffing.PermissionLevel`) is
  the **access tier** — `Staff < Supervisor < Manager < Owner` — carried as
  a custom JWT claim (`TenantClaimTypes.PermissionLevel`, deliberately
  *not* `ClaimTypes.Role` — this app doesn't use ASP.NET Core Identity's
  role infrastructure at all). It's the sole input to the authorization
  mechanism below.

A staff member has exactly one `PermissionLevel` and can be assigned one or
more `Role`s (job titles) — the two facts live on the same `StaffMember`
row but answer completely different questions ("what can they do" vs
"what do we call their job for rostering/pay purposes"). Don't use "role"
as shorthand for "permission" in feature docs, command names, or code
review — say `PermissionLevel`/tier explicitly.

### The enforcement mechanism

Every MediatR command and query implements **exactly one** of these two
interfaces (`RosterApp.Application/Common/`), and `AuthorizationBehavior`
— the "authorization" stage of the locked pipeline order above — is the
**single** place PermissionLevel is ever checked. No ad-hoc PermissionLevel
checks in handlers, no `[Authorize(Roles = ...)]` on controllers (this app
has no ASP.NET Identity roles to check against — see above), no permission
checks in FluentValidation validators.

```csharp
public interface IRequiresPermissionLevel
{
    // null = authenticated staff member required, no minimum tier
    // (self-scoped-by-design actions, identity-bootstrap flows).
    PermissionLevel? MinimumPermissionLevel { get; }
}

public interface IPermitsSelfOrMinimumLevel
{
    // For requests carrying an explicit target StaffMemberId distinct
    // from the caller: the resource owner may always act on their own
    // record; anyone else needs at least MinimumPermissionLevelForOthers.
    Guid TargetStaffMemberId { get; }
    PermissionLevel MinimumPermissionLevelForOthers { get; }
}
```

Use `IRequiresPermissionLevel` for anything that isn't "acting on a
specific other staff member's record" — including requests that are
inherently self-scoped because the handler derives identity from
`ICurrentTenantContext.StaffMemberId` rather than the request body (e.g.
`ClockInCommand`, `GetMyShiftsQuery`). Use `IPermitsSelfOrMinimumLevel`
whenever a request carries a client-supplied `StaffMemberId` that could
name someone other than the caller (e.g. viewing/editing another staff
member's availability) — a flat minimum tier would either lock the
resource owner out of their own data or let a low-tier caller act on
someone else's record just because the action is shaped like self-service.

### This is mandatory for every new command/query, not just existing ones

**Whenever you add a new MediatR command or query, deciding its
`IRequiresPermissionLevel`/`IPermitsSelfOrMinimumLevel` policy is part of
writing that command — not an optional follow-up.** Ask: who should be
able to call this — any authenticated staff member, a minimum tier, or the
resource owner plus a minimum tier for anyone else? Then implement the
interface with that answer, even when the answer is "no minimum tier."

This isn't just a review checklist — it's enforced at build time.
`PermissionPolicyCoverageTests`
(`backend/tests/RosterApp.Application.Tests/Common/PermissionPolicyCoverageTests.cs`)
reflects over every MediatR request type in `RosterApp.Application` and
fails if any type implements neither interface (forgot to decide) or both
(the two rule shapes are mutually exclusive). A failure here means "you
forgot to decide this command's access policy," not "the test is wrong" —
don't work around it by adding an exclusion list.

### Known residual gap

`CreateStaffMemberCommand` lets the caller set the new hire's own
`PermissionLevel` (including `Owner`) as part of creating them, with only
a flat Manager-tier check on the command itself — there's no additional
check preventing a Manager-tier caller from minting a new Owner-tier staff
record. Flagged here rather than silently fixed because closing it
properly needs a third rule shape (a tier requirement conditional on a
field's value, not just on the caller or the target), which didn't exist
when this policy system was introduced — treat tightening this as a
deliberate follow-up, not an oversight to route around.

## State management & data layer (frontend)

Three buckets, decided by *where the state comes from* — not one global
store. Work out which bucket before writing any state code.

### 1. Server state → TanStack Query

Anything that originates from the .NET API: shifts, staff, venues,
award-rate breakdowns, availability. TanStack Query owns caching,
refetching, invalidation, and loading/error states — never mirror this
data in Zustand or Context "to make it easier to pass down."

* One `useQuery`/`useMutation` hook per operation.
* Query keys are arrays, most-generic-first: `['shifts', venueId, weekStart]`.
* Mutations invalidate the narrowest relevant key on success, not a
  blanket refetch.
* Realtime note: Supabase Realtime pushes (shift swaps, roster changes)
  aren't fetched via a query — they arrive as subscription events. On
  receipt, write into the TanStack Query cache with
  `queryClient.setQueryData` (or `invalidateQueries` if a full refetch is
  cheap enough) so the rest of the app keeps reading from one source of
  truth instead of a parallel realtime-only state path.

### 2. Cross-cutting client state → Zustand

State with no server backing that genuinely needs to be read/written by
components that aren't in a direct parent/child relationship. On the
roster builder specifically:

* `useVenueContextStore` — the active venue a manager has switched into,
  needed by the venue switcher and by every query key that scopes to a
  venue. Defaults to the first venue in `useCurrentAccount().venues`
  (set by `AppLayout`'s `clientLoader` once the account has loaded — see
  `frontend/app/layouts/AppLayout.tsx`), since no controller lists venues
  on its own; `useCurrentAccount()` is the allowed source for populating a
  venue list anywhere one's needed, until a dedicated venues endpoint
  exists. **TODO:** "first venue in the list" is a placeholder, not a real
  default — add a per-manager default-venue preference (persisted on the
  account/manager record) and switch `AppLayout`'s clientLoader to prefer
  it over `venues[0]` when set.
* `useRosterDraftStore` — in-progress, unpublished shift edits in the
  builder grid, needed by the grid, the award-cost breakdown panel, the
  live labour budget bar, and the publish action together.

Don't create a store as a default — this only applies once you have a
concrete case of two-plus unrelated components needing the same state.
Everything else stays local (see § How to write UI code above). One store
per concern, not one app-wide store; keep actions inside the store rather
than scattering `set()` calls through components.

### 3. Local state → useState / useReducer

Default here first: form inputs, a modal's open state, which tab is
active, hover/focus state. Only escalate to Zustand once local state
genuinely can't reach where it's needed.

### 4. Forms → TanStack Form, but only for complicated forms

TanStack Form (`@tanstack/react-form`) is the standard for **complicated**
forms. Plain `useState`/`useReducer` (§3 above) remains the default for
everything else — adopting TanStack Form is not a blanket replacement for
local state, it's an escalation for a specific shape of problem.

**A form is "complicated" — and should use TanStack Form — when at least
one of these is true:**

* It has **three or more fields** that need to be read together at submit
  time (a single insert/update payload built from multiple inputs).
* A field's **visibility or validity depends on another field's value**
  (e.g. a "blocks" toggle group that only appears when an "all day"
  checkbox is unchecked).
* The **submit action lives outside the fields themselves** — e.g. a Save
  button in a page header, separate from the field-rendering component,
  or a mutation owned by a parent that a shared field component doesn't
  have access to.
* The same field-rendering component is **reused across more than one
  screen** with a different owner of the submit action (e.g. a shared
  "create" and "edit" form where each screen owns its own mutation).

**A single, self-contained control is not a form — keep it on `useState`:**
one switch, one checkbox, one text input, a search box, a filter toggle.
These commit immediately or have no cross-field relationship to anything
else, so `useState` is simpler and correct. Don't reach for TanStack Form
just because a component happens to render an `<Input>`.

**Pattern, once a form qualifies:**

* The screen that owns the mutation (the `useMutation` call) owns the
  `useForm()` instance — not the field-rendering component. This matters
  because the "submit" trigger (e.g. a header Save button) is often in a
  different component than the fields.
* Field-rendering components receive the `form` instance itself as a prop
  (typed via `ReactFormExtendedApi<...>` from `@tanstack/react-form`, with
  each validator generic parameter as `FormValidateOrFn<T> | undefined` /
  `FormAsyncValidateOrFn<T> | undefined` rather than narrowed to
  `undefined` — narrowing breaks assignability from a real `useForm()`
  call) — never a `value`/`onChange` pair.
* Use `form.Field` per field for forms with many independent fields (isolates
  re-renders per keystroke). Use `form.Subscribe` (reading `state.values`,
  writing via `form.setFieldValue`) for compact inline forms that need
  derived cross-field UI, like a field toggling another field's visibility
  or a submit button's disabled state depending on several fields at once.
* Compose fields with shadcn's `Field` / `FieldLabel` / `FieldGroup` /
  `FieldDescription` (`~/components/ui/field`) for layout — same as any
  other shadcn form, per the shadcn skill's forms guidance.
* Don't add a validation library (e.g. zod) by default. Only add validators
  when there's an actual validation rule to express; wiring `form.Field`/
  `form.Subscribe` for value/submit handling doesn't require one.
* Reference implementation: `frontend/app/routes/staff/components/
  StaffMemberForm.tsx` (per-field `form.Field`, shared between create and
  edit) plus `NewStaffMember.tsx` and `StaffProfile.tsx` (each owns a
  `useForm()` instance and its own mutation; `StaffProfile.tsx`'s
  `AvailabilitySection`/`LeaveRequestsSection` show the `form.Subscribe`
  pattern for compact inline forms).

### Types: wire type vs view model

DTOs match the shape of the corresponding MediatR query/command response
exactly; a separate view-model type is what components actually consume.
Map between them once, at the boundary — not scattered through
components.

```ts
// ShiftDto matches the backend query response exactly
interface ShiftDto {
  id: string;
  startUtc: string;
  endUtc: string;
  status: string; // enum as its exact member name over the wire — see § Backend "Wire format for enums"
  awardBreakdown: AwardBreakdownDto[]; // must stay itemised — see "Why it exists"
  complianceViolations: ComplianceViolationDto[]; // itemised, same rule as award breakdown — don't collapse to a boolean "isCompliant" flag
}

interface Shift {
  id: string;
  start: Date;
  end: Date;
  status: ShiftStatus; // string union
  awardBreakdown: AwardBreakdown[];
  complianceViolations: ComplianceViolation[];
}

type ShiftStatus = "draft" | "published" | "confirmed" | "cancelled";
```

The award-rate breakdown is the product's differentiator (see "Why it
exists" above) — keep it as a structured, itemised array all the way
through this mapping. Don't flatten it into a single total anywhere in
the frontend layer. Compliance violations follow the same rule for the
same reason: a manager needs to see *which* rule fired (insufficient
rest vs missing break vs span-of-hours) to make an informed override
decision, not just a generic "non-compliant" flag.

### File placement

Follow the **React Router Framework Mode route-centric structure** described
in the "Frontend architecture and folder structure" section above.

Colocate a screen's data layer with the route that owns the screen. Do not
use the old `frontend/src/components/<domain>/` layout and do not introduce
a parallel `features/` tree.

For example:

```text
frontend/app/routes/roster/
  route.tsx       # React Router route module
  components/
    RosterBuilder.tsx
  types.ts        # ShiftDto / Shift, RosterDto / Roster, mapping functions
  api.ts          # fetchShifts, publishRoster — plain async functions, no React
  hooks.ts        # useShifts, usePublishRoster (TanStack Query)
  store.ts        # useRosterDraftStore (Zustand) — only if the route needs one
```

Cross-route concerns:

```text
frontend/app/lib/
  api-client.ts   # axios/fetch wrapper: base URL, Supabase auth token attach,
                  # tenant/venue header, centralized error normalization

frontend/app/types/
  pagination.ts   # PaginatedResponse<T>, ApiError — only truly shared shapes
```

Global UI:

```text
frontend/app/components/
  ui/             # shadcn/Base UI primitives only
  shared/         # genuinely reusable application-wide components
```

`components/ui/` stays shadcn primitives only, per the Stack decisions
section above — no data-fetching, Zustand stores, route logic, or domain
business logic there.

### React Router route modules and data loading

React Router Framework Mode is responsible for route-level data loading
and mutations where appropriate.

Use route module `loader`s for data that is fundamentally required by a
route before rendering. Use route module `action`s for route-owned mutations
that naturally fit React Router's navigation/form model.

TanStack Query remains the source of truth for general server-state caching,
refetching, invalidation, and client-side server-state access.

Do not blindly duplicate every API request into both a React Router loader
and TanStack Query. Decide based on the responsibility of the data:

* Use a React Router `loader` when the route cannot meaningfully render
  without the data or when the data is naturally tied to route navigation.
* Use TanStack Query for reusable server-state queries, caching, background
  refetching, mutations, and data shared across components.
* Where both are genuinely required, establish one clear boundary and avoid
  maintaining two independent copies of the same state.

React Router route modules should not become a replacement for the
application's server-state architecture.

### Testing

Vitest + React Testing Library.

* Test `types.ts` mapping functions directly — pure functions, no mocking.
* Test hooks with `renderHook` wrapped in a `QueryClientProvider`.
* Test Zustand stores by calling actions directly against
  `store.getState()`, no component needed.
* Test React Router route components/loaders/actions according to the
  responsibilities they own rather than bypassing the route architecture.

### Avoid

* No Redux/RTK — TanStack Query + Zustand + local state covers this app's
  needs; adding a global store contradicts the "don't reach for patterns
  before they're needed" principle above.
* Don't put server data (anything fetched from the .NET API or pushed via
  Supabase Realtime) in Zustand or Context.
* Don't call Supabase directly from the frontend for anything that
  mutates data — all writes go through the .NET API via `api-client.ts`,
  per the Database decision above.
* Don't use `createBrowserRouter()` / `RouterProvider` as the application's
  routing architecture; this project uses React Router Framework Mode.
* Don't create a `frontend/src/pages/` directory.
* Don't create a second routing system alongside React Router Framework Mode.
* Don't place route-specific components in `frontend/app/components/shared/`
  just to make them globally visible.
* Don't put feature-specific data fetching or state in
  `frontend/app/components/ui/`.

## Screens & build order

Built one at a time, each reviewed before moving to the next. This order
was revised from an earlier "build in dependency order" plan to instead
follow the Budget → Roster → Publish → Actual → Reconciled → Export loop
described in "Why it exists" above — each stage is only worth building
once the stage before it exists to feed it, and payroll export was
deliberately pulled forward because it's the closest feature to the
actual purchase decision.

* [x] 1. Roster builder (manager) —
  `frontend/app/routes/roster/`.
  The primary route module is
  `frontend/app/routes/roster/route.tsx`, with screen-level UI under
  `frontend/app/routes/roster/components/`.
  Built. Known open item: drag-and-drop between roster cells is not
  wired up yet (click-to-add/edit only).

* [x] 2. Staff profiles + availability/leave.
  Prerequisite data for everything downstream: pay tier/classification
  and employment type feed `IAwardRateCalculator`; availability/leave
  feed both `IRosterComplianceValidator`'s context and basic
  double-booking prevention in the builder. Build before touching the
  builder enhancements in step 3 — they depend on this data existing.

* [x] 3. Roster builder enhancements (retrofit onto the existing UI, not a
  new screen):

  * Live labour budget bar (running $ / % of forecast-sales target,
    colour-coded), built from the award-breakdown data already
    computed per shift.
  * Inline compliance warnings from `IRosterComplianceValidator`,
    shown as badges on the affected shift with an override-with-reason
    flow for anything above Warning severity.
  * Copy-previous-week / duplicate-roster-as-template.

* [ ] 4. Labour cost dashboard.
  Reporting layer on top of the live budget data from step 3 —
  week-over-week trend, cost by role/venue. Forecast-vs-actual
  comparison in this dashboard is a stub until step 6 (actual hours)
  exists; don't build fake "actual" data to fill the gap early.

* [ ] 5. Staff app: shift view + swap requests.
  Staff-side shift visibility and swap/availability requests; manager
  approval surfaces as an inbox rather than a separate screen.

* [ ] 6. Staff app: clock in/out (GPS-verified) + rostered-vs-actual
  variance.
  Build the variance comparison (rostered vs actual, flagged
  discrepancies, manager approval before hours lock) as part of this
  step, not as a follow-up — the comparison is the differentiated
  value, not the clock itself. This step is also what unblocks the
  forecast-vs-actual view stubbed in step 4.

* [ ] 7. Payroll export.
  CSV export (Xero/MYOB-shaped: employee, pay code, hours, loading
  type) from approved/locked timesheet data produced in step 6. Pulled
  forward from "post-MVP" in the earlier plan — see "Why it exists"
  above for the reasoning.
