import { MOCK_STAFF, MOCK_VENUES } from "./mock-data";
import type {
  AvailabilityExceptionDto,
  AvailabilityExceptionInput,
  LeaveRequestDto,
  LeaveRequestInput,
  LeaveRequestStatus,
  StaffMemberDto,
  StaffMemberInput,
  VenueDto,
} from "./types";
import {
  toAvailabilityExceptionDto,
  toLeaveRequestInputDto,
  toStaffMemberInputDto,
  unmapLeaveRequestStatus,
} from "./types";

// Stubbed API layer backed by an in-memory mock dataset. Real function
// signatures, called with an artificial delay so loading states are
// exercised for real. When the backend exists, mock-data.ts gets deleted
// and only the body of each function below changes to a real fetch call —
// hooks.ts, and every component, stay untouched.

let staffStore: StaffMemberDto[] = MOCK_STAFF.map((s) => ({ ...s }));

function delay<T>(value: T, ms = 150 + Math.random() * 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function mustFindStaff(staffId: string): StaffMemberDto {
  const staff = staffStore.find((s) => s.id === staffId);
  if (!staff) throw new Error(`Unknown staff id: ${staffId}`);
  return staff;
}

export async function fetchVenues(): Promise<VenueDto[]> {
  return delay(MOCK_VENUES);
}

export async function fetchStaffMembers(
  venueId: string,
): Promise<StaffMemberDto[]> {
  // Simulated backend failure — CBD Rooftop's staff sync hasn't completed
  // yet, so listing its staff fails. Exercises the list error state.
  if (venueId === "v3") {
    await delay(null, 300);
    throw new Error("Staff sync for this venue is still in progress. Try again shortly.");
  }
  const staff = staffStore.filter((s) => s.venueIds.includes(venueId));
  return delay(staff.map((s) => ({ ...s })));
}

export async function fetchStaffMember(staffId: string): Promise<StaffMemberDto> {
  return delay({ ...mustFindStaff(staffId) });
}

export async function saveStaffMember(
  input: StaffMemberInput,
): Promise<StaffMemberDto> {
  const dto = toStaffMemberInputDto(input);

  // Simulated backend guardrail — exercises the save-error state.
  if (dto.maxWeeklyHours > 60) {
    await delay(null, 250);
    throw new Error("Max weekly hours can't exceed 60.");
  }

  if (dto.id) {
    const existing = mustFindStaff(dto.id);
    Object.assign(existing, dto);
    return delay({ ...existing });
  }

  const created: StaffMemberDto = {
    id: crypto.randomUUID(),
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    employmentType: dto.employmentType,
    classification: dto.classification,
    maxWeeklyHours: dto.maxWeeklyHours,
    venueIds: dto.venueIds,
    unavailability: [],
    leaveRequests: [],
  };
  staffStore = [...staffStore, created];
  return delay({ ...created });
}

export async function addAvailabilityException(
  staffId: string,
  input: AvailabilityExceptionInput,
): Promise<AvailabilityExceptionDto> {
  const staff = mustFindStaff(staffId);
  const dto = toAvailabilityExceptionDto(input, crypto.randomUUID());
  staff.unavailability = [...staff.unavailability, dto];
  return delay({ ...dto });
}

export async function removeAvailabilityException(
  staffId: string,
  exceptionId: string,
): Promise<void> {
  const staff = mustFindStaff(staffId);
  staff.unavailability = staff.unavailability.filter((e) => e.id !== exceptionId);
  return delay(undefined);
}

export async function createLeaveRequest(
  staffId: string,
  input: LeaveRequestInput,
): Promise<LeaveRequestDto> {
  const staff = mustFindStaff(staffId);
  const created: LeaveRequestDto = {
    id: crypto.randomUUID(),
    status: 0, // requested
    ...toLeaveRequestInputDto(input),
  };
  staff.leaveRequests = [...staff.leaveRequests, created];
  return delay({ ...created });
}

export async function updateLeaveRequestStatus(
  staffId: string,
  leaveRequestId: string,
  status: LeaveRequestStatus,
): Promise<LeaveRequestDto> {
  const staff = mustFindStaff(staffId);
  const leaveRequest = staff.leaveRequests.find((l) => l.id === leaveRequestId);
  if (!leaveRequest) {
    throw new Error(`Unknown leave request id: ${leaveRequestId}`);
  }
  leaveRequest.status = unmapLeaveRequestStatus(status);
  return delay({ ...leaveRequest });
}
