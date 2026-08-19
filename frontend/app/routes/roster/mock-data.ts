import type {
  BudgetTargetDto,
  ShiftDto,
  StaffMemberDto,
  VenueDto,
} from "./types";
import { unmapRole } from "./types";

// In-memory mock dataset standing in for the real backend — see api.ts.
// Deleted once a real .NET API exists; only the body of each api.ts
// function changes at that point. Follows the same pattern as
// routes/staff/mock-data.ts.

export const MOCK_VENUES: VenueDto[] = [
  { id: "v1", name: "Little Collins Café", suburb: "Melbourne CBD" },
  { id: "v2", name: "Fitzroy Yard", suburb: "Fitzroy" },
];

export const MOCK_STAFF: StaffMemberDto[] = [
  { id: "s1", name: "Priya Nair", role: unmapRole("kitchen"), title: "Cook Gr3", rate: 27.1, venueIds: ["v1"] },
  { id: "s2", name: "Jordan Blake", role: unmapRole("kitchen"), title: "Kitchen Hand", rate: 24.8, venueIds: ["v1"] },
  { id: "s3", name: "Maya Chen", role: unmapRole("floor"), title: "F&B Attendant Gr3", rate: 26.2, venueIds: ["v1"] },
  { id: "s4", name: "Liam O'Connor", role: unmapRole("floor"), title: "F&B Attendant Gr2", rate: 25.1, venueIds: ["v1"] },
  { id: "s5", name: "Sofia Russo", role: unmapRole("bar"), title: "Bartender Gr3", rate: 27.9, venueIds: ["v1"] },
  { id: "s6", name: "Tom Whitfield", role: unmapRole("manager"), title: "Supervisor", rate: 32.4, venueIds: ["v1"] },
  // Fitzroy Yard's own roster — previously the venue switcher didn't
  // actually scope staff/shifts by venue at all; this retrofit fixes that,
  // so v2 needs its own staff to make the switch visibly do something.
  { id: "s9", name: "Nina Kapoor", role: unmapRole("floor"), title: "F&B Attendant Gr3", rate: 26.2, venueIds: ["v2"] },
  { id: "s10", name: "Marcus Webb", role: unmapRole("kitchen"), title: "Cook Gr2", rate: 25.6, venueIds: ["v2"] },
];

function weekKey(venueId: string, weekStartIso: string): string {
  return `${venueId}:${weekStartIso}`;
}

// Current week (matches route.tsx's original WEEK_START = Mon 17 Aug 2026)
// plus deliberate compliance scenarios: s4 gets a late-close/early-open
// pair (Fri 11pm close, Sat 6am open — the exact example from CLAUDE.md's
// IRosterComplianceValidator rationale) to exercise Blocking severity and
// the override flow; s3 gets an 8.5h-rest pair to exercise Warning
// severity distinctly; s2's existing no-break 6h shifts already exercise
// the missing-break rule; s6 gets a 13h-span shift for span-of-hours.
const CURRENT_WEEK_V1: ShiftDto[] = [
  { id: "sh1", staffId: "s1", dayOfWeek: 0, start: "07:00", end: "15:00", breakMins: 30 },
  { id: "sh2", staffId: "s1", dayOfWeek: 1, start: "07:00", end: "15:00", breakMins: 30 },
  { id: "sh3", staffId: "s1", dayOfWeek: 4, start: "12:00", end: "20:00", breakMins: 30 },
  { id: "sh4", staffId: "s1", dayOfWeek: 5, start: "10:00", end: "18:00", breakMins: 30 },
  { id: "sh5", staffId: "s2", dayOfWeek: 0, start: "07:00", end: "13:00", breakMins: 0 },
  { id: "sh6", staffId: "s2", dayOfWeek: 2, start: "07:00", end: "13:00", breakMins: 0 },
  { id: "sh7", staffId: "s2", dayOfWeek: 6, start: "09:00", end: "15:00", breakMins: 30 },
  { id: "sh8", staffId: "s3", dayOfWeek: 1, start: "11:00", end: "19:00", breakMins: 30 },
  { id: "sh9", staffId: "s3", dayOfWeek: 4, start: "11:00", end: "21:00", breakMins: 30 },
  { id: "sh10", staffId: "s3", dayOfWeek: 5, start: "09:00", end: "17:00", breakMins: 30 },
  { id: "sh10b", staffId: "s3", dayOfWeek: 2, start: "16:00", end: "23:00", breakMins: 30 },
  { id: "sh10c", staffId: "s3", dayOfWeek: 3, start: "07:30", end: "15:00", breakMins: 30 },
  { id: "sh11", staffId: "s4", dayOfWeek: 0, start: "11:00", end: "19:00", breakMins: 30 },
  { id: "sh12", staffId: "s4", dayOfWeek: 3, start: "11:00", end: "19:00", breakMins: 30 },
  { id: "sh13", staffId: "s4", dayOfWeek: 6, start: "10:00", end: "16:00", breakMins: 0 },
  { id: "sh13b", staffId: "s4", dayOfWeek: 4, start: "15:00", end: "23:00", breakMins: 30 },
  { id: "sh13c", staffId: "s4", dayOfWeek: 5, start: "06:00", end: "14:00", breakMins: 30 },
  { id: "sh14", staffId: "s5", dayOfWeek: 4, start: "16:00", end: "23:00", breakMins: 30 },
  { id: "sh15", staffId: "s5", dayOfWeek: 5, start: "16:00", end: "23:30", breakMins: 30 },
  { id: "sh16", staffId: "s5", dayOfWeek: 6, start: "15:00", end: "22:00", breakMins: 30 },
  { id: "sh17", staffId: "s6", dayOfWeek: 1, start: "08:00", end: "16:00", breakMins: 30 },
  { id: "sh18", staffId: "s6", dayOfWeek: 5, start: "10:00", end: "18:00", breakMins: 30 },
  { id: "sh18b", staffId: "s6", dayOfWeek: 2, start: "08:00", end: "21:00", breakMins: 30 },
];

// Previous week (Mon 10 Aug 2026) — a smaller, slightly different set so
// "copy previous week" visibly changes the grid rather than reproducing
// the current week exactly.
const PREVIOUS_WEEK_V1: ShiftDto[] = [
  { id: "psh1", staffId: "s1", dayOfWeek: 0, start: "07:00", end: "15:00", breakMins: 30 },
  { id: "psh2", staffId: "s1", dayOfWeek: 4, start: "12:00", end: "20:00", breakMins: 30 },
  { id: "psh3", staffId: "s2", dayOfWeek: 1, start: "07:00", end: "13:00", breakMins: 0 },
  { id: "psh4", staffId: "s3", dayOfWeek: 1, start: "11:00", end: "19:00", breakMins: 30 },
  { id: "psh5", staffId: "s3", dayOfWeek: 5, start: "09:00", end: "17:00", breakMins: 30 },
  { id: "psh6", staffId: "s4", dayOfWeek: 0, start: "11:00", end: "19:00", breakMins: 30 },
  { id: "psh7", staffId: "s5", dayOfWeek: 5, start: "16:00", end: "23:30", breakMins: 30 },
  { id: "psh8", staffId: "s6", dayOfWeek: 1, start: "08:00", end: "16:00", breakMins: 30 },
];

const CURRENT_WEEK_V2: ShiftDto[] = [
  { id: "vsh1", staffId: "s9", dayOfWeek: 0, start: "10:00", end: "18:00", breakMins: 30 },
  { id: "vsh2", staffId: "s9", dayOfWeek: 5, start: "09:00", end: "17:00", breakMins: 30 },
  { id: "vsh3", staffId: "s10", dayOfWeek: 1, start: "07:00", end: "15:00", breakMins: 30 },
  { id: "vsh4", staffId: "s10", dayOfWeek: 6, start: "08:00", end: "14:00", breakMins: 0 },
];

// v2 deliberately has no entry for the previous week — exercises the
// "no previous week exists yet" empty state for copy-previous-week.
export const MOCK_SHIFTS: Record<string, ShiftDto[]> = {
  [weekKey("v1", "2026-08-17")]: CURRENT_WEEK_V1,
  [weekKey("v1", "2026-08-10")]: PREVIOUS_WEEK_V1,
  [weekKey("v2", "2026-08-17")]: CURRENT_WEEK_V2,
};

// v2 deliberately has no target set — exercises the "no target set" state
// (running total shown without colour-coding).
export const MOCK_BUDGET_TARGETS: Record<string, BudgetTargetDto> = {
  v1: { venueId: "v1", weeklyTarget: 9200 },
};
