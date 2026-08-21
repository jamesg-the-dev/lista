import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { currentAccountQueryOptions } from '~/lib/account/hooks';

import * as api from './api';
import type {
  AvailabilityExceptionInput,
  LeaveRequestInput,
  LeaveRequestStatus,
  StaffMemberInput,
} from './types';
import { mapLeaveRequest, mapStaffAvailability, mapStaffMember } from './types';

export function useVenues() {
  return useQuery({
    ...currentAccountQueryOptions,
    select: account => account.venues.map(v => ({ id: v.venueId, name: v.name })),
  });
}

export function useStaffMembers(venueId: string) {
  return useQuery({
    queryKey: ['staff', 'list', venueId],
    queryFn: async () => (await api.fetchStaffMembers(venueId)).map(mapStaffMember),
    enabled: !!venueId,
  });
}

export function useStaffMember(staffId: string | null) {
  return useQuery({
    queryKey: ['staff', 'detail', staffId],
    queryFn: async () => mapStaffMember(await api.fetchStaffMember(staffId!)),
    enabled: !!staffId,
  });
}

export function useStaffAvailability(staffId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['staff', 'availability', staffId, from, to],
    queryFn: async () =>
      mapStaffAvailability(await api.fetchStaffAvailability(staffId, from, to)),
    enabled: !!staffId,
  });
}

export function useSaveStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffMemberInput) =>
      input.id ? api.updateStaffMember(input.id, input) : api.createStaffMember(input),
    onSuccess: dto => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'staff' && query.queryKey[1] === 'list',
      });
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', dto.id] });
    },
  });
}

export function useAddAvailabilityException(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AvailabilityExceptionInput) =>
      api.setStandingUnavailability(staffId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', staffId] });
    },
  });
}

export function useRemoveAvailabilityException(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: string) =>
      api.removeStandingUnavailability(staffId, exceptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', staffId] });
    },
  });
}

export function useCreateLeaveRequest(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveRequestInput) =>
      mapLeaveRequest(await api.submitLeaveRequest(staffId, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', staffId] });
    },
  });
}

// Backend only exposes approve/decline as separate commands (there's no
// "revert to requested"); the frontend still passes a LeaveRequestStatus in
// so the calling UI (approve/decline buttons) stays unchanged from the mock.
export function useUpdateLeaveRequestStatus(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leaveRequestId,
      status,
    }: {
      leaveRequestId: string;
      status: LeaveRequestStatus;
    }) =>
      mapLeaveRequest(
        await (status === 'approved'
          ? api.approveLeaveRequest(leaveRequestId)
          : api.declineLeaveRequest(leaveRequestId)),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', staffId] });
    },
  });
}
