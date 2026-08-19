import type { StaffMemberDto, VenueDto } from "./types";

// In-memory mock dataset standing in for the real backend — see api.ts.
// Deleted once a real .NET API exists; only the body of each api.ts
// function changes at that point.

export const MOCK_VENUES: VenueDto[] = [
  { id: "v1", name: "Little Collins Café", suburb: "Melbourne CBD" },
  { id: "v2", name: "Fitzroy Yard", suburb: "Fitzroy" },
  // Deliberately errors on fetchStaffMembers below — exercises the list
  // error state (e.g. a venue whose staff sync from a recent migration
  // hasn't completed).
  { id: "v3", name: "CBD Rooftop", suburb: "Melbourne CBD" },
  // Deliberately has zero staff assigned — exercises the empty state.
  { id: "v4", name: "Southbank Kiosk", suburb: "Southbank" },
];

export const MOCK_STAFF: StaffMemberDto[] = [
  {
    id: "s1",
    name: "Ava Thompson",
    email: "ava.thompson@example.com",
    phone: "0412 345 001",
    employmentType: 2, // full_time
    classification: 4, // level_4
    maxWeeklyHours: 38,
    venueIds: ["v1"],
    unavailability: [{ id: "ax1", dayOfWeek: 1, isAllDay: true, blocks: [] }],
    leaveRequests: [
      {
        id: "lr1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        status: 0, // requested
        reason: "Annual leave — visiting family",
      },
    ],
  },
  {
    id: "s2",
    name: "Noah Whitfield",
    email: "noah.whitfield@example.com",
    phone: "0412 345 002",
    employmentType: 0, // casual
    classification: 2, // level_2
    maxWeeklyHours: 20,
    venueIds: ["v1"],
    unavailability: [
      { id: "ax2", dayOfWeek: 4, isAllDay: false, blocks: [0, 1] }, // Fri morning+afternoon only — evenings free
    ],
    leaveRequests: [
      {
        id: "lr2",
        startDate: "2026-07-10",
        endDate: "2026-07-12",
        status: 1, // approved
        reason: "Sick leave",
      },
    ],
  },
  {
    id: "s3",
    name: "Isla Ferraro",
    email: "isla.ferraro@example.com",
    phone: "0412 345 003",
    employmentType: 1, // part_time
    classification: 3, // level_3
    maxWeeklyHours: 25,
    venueIds: ["v1", "v2"],
    unavailability: [],
    leaveRequests: [],
  },
  {
    id: "s4",
    name: "Kai Nguyen",
    email: "kai.nguyen@example.com",
    phone: "0412 345 004",
    employmentType: 0, // casual
    classification: 1, // level_1
    maxWeeklyHours: 15,
    venueIds: ["v1"],
    unavailability: [{ id: "ax3", dayOfWeek: 6, isAllDay: true, blocks: [] }],
    leaveRequests: [],
  },
  {
    id: "s5",
    name: "Ruby Sinclair",
    email: "ruby.sinclair@example.com",
    phone: "0412 345 005",
    employmentType: 2, // full_time
    classification: 6, // level_6 — supervisor
    maxWeeklyHours: 38,
    venueIds: ["v1"],
    unavailability: [],
    leaveRequests: [
      {
        id: "lr3",
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        status: 2, // declined
        reason: "Personal leave",
      },
    ],
  },
  {
    id: "s6",
    name: "Ethan Delacroix",
    email: "ethan.delacroix@example.com",
    phone: "0412 345 006",
    employmentType: 0, // casual
    classification: 0, // introductory
    maxWeeklyHours: 10,
    venueIds: ["v1"],
    unavailability: [
      { id: "ax4", dayOfWeek: 0, isAllDay: true, blocks: [] },
      { id: "ax5", dayOfWeek: 2, isAllDay: true, blocks: [] },
    ],
    leaveRequests: [],
  },
  {
    id: "s7",
    name: "Mia Okafor",
    email: "mia.okafor@example.com",
    phone: "0412 345 007",
    employmentType: 1, // part_time
    classification: 3, // level_3
    maxWeeklyHours: 24,
    venueIds: ["v2"],
    unavailability: [{ id: "ax6", dayOfWeek: 5, isAllDay: false, blocks: [2] }], // Sat evening
    leaveRequests: [],
  },
  {
    id: "s8",
    name: "Lucas Bianchi",
    email: "lucas.bianchi@example.com",
    phone: "0412 345 008",
    employmentType: 0, // casual
    classification: 2, // level_2
    maxWeeklyHours: 18,
    venueIds: ["v1"],
    unavailability: [],
    leaveRequests: [],
  },
];
