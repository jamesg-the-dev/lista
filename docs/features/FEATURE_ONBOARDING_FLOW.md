# Feature: Onboarding Flow (Sign-up + Setup Checklist)

## Context — read first

Before writing any code:
1. Read `CLAUDE.md` in the project root for project conventions, tech stack, and coding standards.
2. Read `docs/design-system.md` for typography, color tokens, spacing, and component styling rules.
3. Skim the existing Venue Profile and Award & Pay Configuration settings specs/components if present in the repo — this feature should reuse those forms rather than duplicating field definitions.

Treat both documents as canonical. If anything in this spec conflicts with `CLAUDE.md` or the design system, defer to those files and flag the conflict instead of silently picking one.

## Design reference (visual inspiration only — do not install)

The visual direction for the setup checklist should draw from the **Onboarding Feed** block pattern on Shadcn Studio:
`https://shadcnstudio.com/blocks/dashboard-and-application/onboarding-feed`

Important constraint: these are **Basic-plan blocks behind Shadcn Studio's paid tier**. We do not have access to their CLI install command or the block source code. Do not attempt to fetch, scrape, or reconstruct their proprietary source. Instead:

- Treat the block descriptions as a design brief: a card-based checklist with progress indicators, each card representing a setup task, customizable styling, and (per their description) drag-and-drop support.
- Build an original implementation from scratch using our own shadcn/ui components (Card, Progress, Badge, Button, Checkbox/CheckCircle icon states) and our existing design tokens from `docs/design-system.md`.
- Prioritize getting the *interaction pattern* right (progress tracking, skippable cards, expand-to-form-or-navigate) over pixel-matching their exact visual style.
- If you want a second reference point for a checklist/progress UI pattern within the shadcn ecosystem, the Stepper component (`https://shadcnstudio.com/docs/components/stepper`) is documented and freely usable — feel free to draw from it for the progress indicator specifically.

## Goal

Build a two-phase onboarding experience for new Hospo Roster signups:

1. **Sign-up** — minimal-friction account creation, no credit card required.
2. **Setup checklist** — a persistent, skippable, progress-tracked checklist on the dashboard that guides the owner through venue setup, award configuration, staff invites, and their first roster.

The product principle: get the venue owner to a built roster as fast as possible. Every step after account creation must be skippable except the final "build first roster" action, which should be reachable even if every prior step was skipped (using placeholder/dummy data where needed).

## Phase 1: Sign-up

### Fields
- Full name (skip this field if signing up via SSO — infer from provider)
- Work email
- Password (or "Continue with Google" / "Continue with Microsoft" SSO buttons, shown above the email/password fields)
- Venue name

### Requirements
- Single centered card, no multi-step wizard — this is one screen.
- Primary CTA: "Start your free 2-month trial"
- Microcopy directly under the CTA: "No credit card required"
- No billing, ABN, or payment fields anywhere in this phase.
- Use TanStack Form for the form itself. Standard validation only (email format, password strength indicator if not using SSO) — this form does not need the nested/array-field patterns used elsewhere in the app.
- On successful sign-up, redirect straight into the dashboard with the setup checklist visible, not an empty dashboard.

## Phase 2: Setup checklist (Onboarding Feed pattern)

### Layout
- Lives at the top of the dashboard (or as the dashboard itself) until the venue owner completes or explicitly dismisses it.
- A progress indicator showing "X of 4 complete" — use the shadcn Progress component.
- Four cards, each representing a setup task. Cards show a completed state (checkmark, muted styling) once done.
- Every card except "Build first roster" has a visible "Skip for now" action alongside the primary action.
- The checklist should be dismissible/collapsible once all steps are complete or skipped, but should persist (not disappear permanently) until explicitly dismissed by the user.

### Card 1: Venue Profile
Fields: venue type (select — cafe/restaurant/bar/QSR/etc.), state/territory (select — determines award and public holiday rules downstream), trading days and hours.
Action: opens the existing Venue Profile settings form (reuse, don't duplicate) either inline/expanded or via navigation to `/venues/:venueId/settings/venue-profile`.

### Card 2: Award & Pay Setup
Behavior: auto-suggest the likely modern award based on venue type + state entered in Card 1, presented as a pre-filled confirmation rather than a blank form. Owner can accept the suggestion or change it.
Framing: copy should emphasize "we'll handle the award math for you" — this is the product's core differentiator, not a compliance chore.
Action: opens/reuses the existing Award & Pay Configuration settings form.

### Card 3: Add Staff
Fields: bulk email invite (textarea or CSV-style paste), or individual add.
Skip behavior: if skipped, the roster builder in Card 4 should be pre-populated with placeholder staff so the owner can still explore the product.

### Card 4: Build First Roster
Action: navigates directly into the roster builder for the current fortnight. This card has no "skip" option — it's the destination, not a task.
If staff were skipped in Card 3, pre-load with dummy/example staff data so the roster builder isn't empty.

## State management

- Track checklist item completion/skip status client-side in Zustand for instant UI feedback (no loading spinner every time a card is expanded or collapsed).
- Persist completion state server-side against the Venue aggregate (e.g. a `VenueOnboardingStatus` value object or similar), following the existing DDD patterns in the .NET backend — private setters, factory methods where applicable. Check `CLAUDE.md` / existing aggregate patterns for the exact convention before implementing.
- On page load, hydrate the Zustand store from the server-persisted status so progress survives across sessions and devices.

## Explicitly out of scope for this feature
- Any billing/payment/credit card UI
- ABN collection
- Detailed roster rules & compliance settings (this is a separate, later settings area, not part of onboarding)
- Trial-expiry messaging or upgrade prompts (handled separately, later in the trial lifecycle)

## Deliverables
1. Sign-up page/route and form.
2. Dashboard setup checklist component (Onboarding Feed pattern), including progress tracking and skip behavior.
3. Wiring for each card to its corresponding existing settings form or the roster builder.
4. Zustand store for checklist state, with server persistence hook-up.
5. Brief summary at the end of implementation noting any assumptions made where this spec was ambiguous, and any conflicts found with `CLAUDE.md` or `docs/design-system.md`.