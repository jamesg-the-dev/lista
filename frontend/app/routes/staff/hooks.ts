import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addAvailabilityException,
  createLeaveRequest,
  fetchStaffMember,
  fetchStaffMembers,
  fetchVenues,
  removeAvailabilityException,
  saveStaffMember,
  updateLeaveRequestStatus,
} from "./api";
import type {
  AvailabilityExceptionInput,
  LeaveRequestInput,
  LeaveRequestStatus,
  StaffMemberInput,
} from "./types";
import { mapLeaveRequest, mapStaffMember } from "./types";

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: fetchVenues,
  });
}

export function useStaffMembers(venueId: string) {
  return useQuery({
    queryKey: ["staff", "list", venueId],
    queryFn: async () => (await fetchStaffMembers(venueId)).map(mapStaffMember),
    enabled: !!venueId,
  });
}

export function useStaffMember(staffId: string | null) {
  return useQuery({
    queryKey: ["staff", "detail", staffId],
    queryFn: async () => mapStaffMember(await fetchStaffMember(staffId!)),
    enabled: !!staffId,
  });
}

export function useSaveStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffMemberInput) => saveStaffMember(input),
    onSuccess: (dto) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "staff" && query.queryKey[1] === "list",
      });
      queryClient.invalidateQueries({ queryKey: ["staff", "detail", dto.id] });
    },
  });
}

export function useAddAvailabilityException(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AvailabilityExceptionInput) =>
      addAvailabilityException(staffId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", "detail", staffId] });
    },
  });
}

export function useRemoveAvailabilityException(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: string) =>
      removeAvailabilityException(staffId, exceptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", "detail", staffId] });
    },
  });
}

export function useCreateLeaveRequest(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveRequestInput) =>
      mapLeaveRequest(await createLeaveRequest(staffId, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", "detail", staffId] });
    },
  });
}

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
        await updateLeaveRequestStatus(staffId, leaveRequestId, status),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", "detail", staffId] });
    },
  });
}
