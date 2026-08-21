import { apiClient } from '~/lib/api-client';

import type {
  AvailabilityExceptionDto,
  AvailabilityExceptionInput,
  LeaveRequestDto,
  LeaveRequestInput,
  PermissionLevel,
  StaffAvailabilityDto,
  StaffMemberDto,
  StaffMemberInput,
} from './types';
import {
  toCreateStaffMemberRequestDto,
  toLeaveRequestInputDto,
  toSetStandingUnavailabilityRequestDto,
  toUpdateStaffMemberRequestDto,
  unmapPermissionLevel,
} from './types';

// Backed by StaffController and LeaveRequestController — see types.ts's
// file header. Venue listing has no controller of its own, so it isn't
// here; see hooks.ts's useVenues, sourced from useCurrentAccount() instead.

export function fetchStaffMembers(venueId: string): Promise<StaffMemberDto[]> {
  return apiClient.get<StaffMemberDto[]>(`/api/venues/${venueId}/staff`);
}

export function fetchStaffMember(staffId: string): Promise<StaffMemberDto> {
  return apiClient.get<StaffMemberDto>(`/api/staff/${staffId}`);
}

export function createStaffMember(input: StaffMemberInput): Promise<StaffMemberDto> {
  return apiClient.post<StaffMemberDto>('/api/staff', toCreateStaffMemberRequestDto(input));
}

export function updateStaffMember(
  staffId: string,
  input: StaffMemberInput,
): Promise<StaffMemberDto> {
  return apiClient.put<StaffMemberDto>(
    `/api/staff/${staffId}`,
    toUpdateStaffMemberRequestDto(input),
  );
}

// Owner-only per FEATURE_SETTINGS_STAFF_ROLES.md §5 (not enforced by the
// backend yet — see AuthorizationBehavior's TODO), called from Settings →
// Staff & Roles' StaffEditDrawer, not from this route's own profile form.

export function updateStaffPermissionLevel(
  staffId: string,
  permissionLevel: PermissionLevel,
): Promise<StaffMemberDto> {
  return apiClient.put<StaffMemberDto>(`/api/staff/${staffId}/permission-level`, {
    permissionLevel: unmapPermissionLevel(permissionLevel),
  });
}

export function setStaffPayRateOverride(
  staffId: string,
  overrideHourlyRate: number,
  reason: string,
): Promise<StaffMemberDto> {
  return apiClient.put<StaffMemberDto>(`/api/staff/${staffId}/pay-rate-override`, {
    overrideHourlyRate,
    reason,
  });
}

export function clearStaffPayRateOverride(staffId: string): Promise<StaffMemberDto> {
  return apiClient.delete<StaffMemberDto>(`/api/staff/${staffId}/pay-rate-override`);
}

export function fetchStaffAvailability(
  staffId: string,
  from: string,
  to: string,
): Promise<StaffAvailabilityDto> {
  const params = new URLSearchParams({ from, to });
  return apiClient.get<StaffAvailabilityDto>(
    `/api/staff/${staffId}/availability?${params}`,
  );
}

export function setStandingUnavailability(
  staffId: string,
  input: AvailabilityExceptionInput,
): Promise<AvailabilityExceptionDto> {
  return apiClient.post<AvailabilityExceptionDto>(
    `/api/staff/${staffId}/unavailability`,
    toSetStandingUnavailabilityRequestDto(input),
  );
}

export function removeStandingUnavailability(
  staffId: string,
  exceptionId: string,
): Promise<void> {
  return apiClient.delete<void>(`/api/staff/${staffId}/unavailability/${exceptionId}`);
}

export function submitLeaveRequest(
  staffId: string,
  input: LeaveRequestInput,
): Promise<LeaveRequestDto> {
  return apiClient.post<LeaveRequestDto>(
    `/api/staff/${staffId}/leave-requests`,
    toLeaveRequestInputDto(input),
  );
}

export function approveLeaveRequest(leaveRequestId: string): Promise<LeaveRequestDto> {
  return apiClient.post<LeaveRequestDto>(`/api/leave-requests/${leaveRequestId}/approve`);
}

export function declineLeaveRequest(leaveRequestId: string): Promise<LeaveRequestDto> {
  return apiClient.post<LeaveRequestDto>(`/api/leave-requests/${leaveRequestId}/decline`);
}
