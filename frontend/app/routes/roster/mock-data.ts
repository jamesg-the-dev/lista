import type { StaffMemberDto } from './types';
import { unmapRole } from './types';

// In-memory mock dataset for the roster grid's staff (role/title/rate) — see
// api.ts's file header for why this stays mocked (no controller backs this
// shape) while shifts/budget/venues now come from real endpoints/account
// data. venueIds below are illustrative labels only, not real venue GUIDs —
// api.ts's fetchStaffMembers doesn't filter by them (see its comment).

export const MOCK_STAFF: StaffMemberDto[] = [
  {
    id: 's1',
    name: 'Priya Nair',
    role: unmapRole('kitchen'),
    title: 'Cook Gr3',
    rate: 27.1,
    venueIds: ['v1'],
  },
  {
    id: 's2',
    name: 'Jordan Blake',
    role: unmapRole('kitchen'),
    title: 'Kitchen Hand',
    rate: 24.8,
    venueIds: ['v1'],
  },
  {
    id: 's3',
    name: 'Maya Chen',
    role: unmapRole('floor'),
    title: 'F&B Attendant Gr3',
    rate: 26.2,
    venueIds: ['v1'],
  },
  {
    id: 's4',
    name: "Liam O'Connor",
    role: unmapRole('floor'),
    title: 'F&B Attendant Gr2',
    rate: 25.1,
    venueIds: ['v1'],
  },
  {
    id: 's5',
    name: 'Sofia Russo',
    role: unmapRole('bar'),
    title: 'Bartender Gr3',
    rate: 27.9,
    venueIds: ['v1'],
  },
  {
    id: 's6',
    name: 'Tom Whitfield',
    role: unmapRole('manager'),
    title: 'Supervisor',
    rate: 32.4,
    venueIds: ['v1'],
  },
  {
    id: 's9',
    name: 'Nina Kapoor',
    role: unmapRole('floor'),
    title: 'F&B Attendant Gr3',
    rate: 26.2,
    venueIds: ['v2'],
  },
  {
    id: 's10',
    name: 'Marcus Webb',
    role: unmapRole('kitchen'),
    title: 'Cook Gr2',
    rate: 25.6,
    venueIds: ['v2'],
  },
];
