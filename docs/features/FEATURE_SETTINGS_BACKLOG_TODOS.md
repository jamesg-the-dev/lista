# Owner Settings — Backlog (TODO, Not Yet Speccd)

**Status:** Deferred — placeholder notes only, not ready for build

These four groups are real, needed settings sections, but are intentionally **not** fully
specced yet. They're noted here so they're not forgotten, and so the four built sections
(Venue Profile, Award & Pay, Roster Rules, Staff & Roles) can reserve the right hooks
(tab slots, nav entries, `venueId`-scoped config pattern) without over-building ahead of need.

---

## 5. Notifications & Communication — TODO

Rough scope to flesh out later:
- Roster publish notification channel (email / SMS / push) — likely a per-staff preference,
  not venue-wide, once built.
- Shift swap / reminder notification timing (e.g. "notify staff 24h before shift").
- Manager approval requirements for swaps (relates to `VenueAvailabilitySettings` in Staff &
  Roles — worth checking for overlap when this gets specced).

**Open question to resolve before speccing:** which notification provider(s) — Supabase has
options, but SMS in AU usually needs a dedicated provider (Twilio et al.) with real cost per
message, so this needs a pricing/cost-model conversation before the data model gets locked in.

---

## 6. Labour Cost & Budgeting — TODO

Rough scope to flesh out later:
- Target labour cost % of revenue, feeding the labour cost dashboard (already on the MVP
  build order, roadmap-wise).
- Weekly/daily labour budget caps with warnings when a draft roster exceeds them.

**Dependency note:** this section can't be properly specced until the Labour Cost Dashboard
feature itself (later in the MVP build order) has its data model settled, since the settings
here are just inputs/thresholds for that dashboard's calculations — speccing the threshold
config before the thing it thresholds exists risks designing against assumptions that don't
hold once the dashboard is real.

---

## 7. Payroll Export — TODO

Rough scope to flesh out later:
- Export format selection (Xero, MYOB, KeyPay, generic CSV).
- Pay item mapping (ordinary hours, overtime, penalties → specific pay categories in the
  target payroll system).

**Dependency note:** heavily dependent on Award & Pay Configuration (already specced) being
built and stable first, since export mapping is downstream of however rates/penalties/super
end up being calculated and stored. Also worth scoping per-provider — Xero/MYOB/KeyPay each
have different APIs vs. flat-file import conventions, which will meaningfully change the
shape of this feature (API integration vs. file generation) rather than being a single
uniform "export" concept.

---

## 8. GPS Clock-in — TODO (Phase 2, deliberately deferred)

Already flagged in project notes as Phase 2 due to Australian workplace surveillance law
complexity (notification/consent obligations vary by state, and some require registering
surveillance devices with authorities). Rough scope for when it's picked up:
- Enable/disable toggle per venue.
- Geofence radius configuration.
- Override permissions (who can clock a staff member in/out manually if GPS fails).

**Do not build ahead of a legal review** — this is the one settings group in the whole list
where getting the compliance research wrong has real regulatory exposure beyond "we
calculated pay slightly wrong," so it should stay a placeholder until that review happens.
