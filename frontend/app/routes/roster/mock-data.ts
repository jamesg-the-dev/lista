import type { StaffMemberDto, VenueDto } from "./types";
import { unmapRole } from "./types";

// In-memory mock dataset for venues/staff — see api.ts's file header for why
// these two stay mocked (no backing controller yet) while shifts/budget now
// call the real RosterController endpoints. Follows the same pattern as
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
