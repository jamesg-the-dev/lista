import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchVenueProfile } from '~/routes/settings/api';
import { createStaffMember } from '~/routes/staff/api';
import type { StaffMemberInput } from '~/routes/staff/types';

import * as api from './api';
import { useOnboardingStore } from './store';
import type { OnboardingStepKey, OnboardingStepStatus } from './types';
import { mapOnboardingStatus } from './types';

// Deliberately a separate query key from settings/hooks.ts's useVenueProfile
// (['settings','venue-profile',venueId]) even though both hit the same GET
// /api/venues/{id}/profile endpoint — the two hooks map the response to
// different view models (VenueProfile vs OnboardingStatus), and TanStack
// Query dedupes strictly by key, so sharing a key would let whichever hook
// mounted first dictate the cached shape for the other.
export function useOnboardingStatus(venueId: string) {
  return useQuery({
    queryKey: ['home', 'onboarding-status', venueId],
    queryFn: async () => mapOnboardingStatus((await fetchVenueProfile(venueId)).onboardingStatus),
    enabled: !!venueId,
  });
}

export function useSetOnboardingStepStatus(venueId: string) {
  const queryClient = useQueryClient();
  const setStepStatus = useOnboardingStore(s => s.setStepStatus);

  return useMutation({
    mutationFn: ({ step, status }: { step: OnboardingStepKey; status: OnboardingStepStatus }) =>
      api.setOnboardingStepStatus(venueId, step, status),
    // Optimistic — the Zustand store updates immediately so every card/the
    // progress bar reflects the change with no loading spinner, per the
    // spec's "instant UI feedback" requirement; the query invalidation
    // below reconciles with the server's actual persisted state shortly
    // after.
    onMutate: ({ step, status }) => setStepStatus(step, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home', 'onboarding-status', venueId] });
    },
  });
}

export function useDismissOnboardingChecklist(venueId: string) {
  const queryClient = useQueryClient();
  const dismiss = useOnboardingStore(s => s.dismiss);

  return useMutation({
    mutationFn: () => api.dismissOnboardingChecklist(venueId),
    onMutate: () => dismiss(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home', 'onboarding-status', venueId] });
    },
  });
}

function placeholderStaffInput(
  overrides: Pick<StaffMemberInput, 'name' | 'email' | 'phone' | 'venueIds'>,
): StaffMemberInput {
  return {
    id: null,
    dateOfBirth: new Date(1990, 0, 1),
    employmentType: 'casual',
    classification: 'level_1',
    maxWeeklyHours: 20,
    permissionLevel: 'staff',
    primaryRoleId: null,
    ...overrides,
  };
}

// Card 3's bulk email invite. CreateStaffMemberCommand has no lighter-weight
// "just an email" invite path (phone/DOB/classification are all required by
// the StaffMember aggregate — see SignUpCommand's doc comment for the same
// constraint applied to the owner's own bootstrap record), so each invited
// row is created with the same "syntactically valid placeholder, corrected
// later" values, using a distinct placeholder phone number per row since
// phone is unique per organisation. Assumption flagged per
// FEATURE_ONBOARDING_FLOW.md — the spec doesn't reconcile "bulk email
// invite" with StaffMember's required-fields shape.
export function useBulkInviteStaff(venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emails: string[]) => {
      for (const [index, email] of emails.entries()) {
        const localPart = email.split('@')[0] || 'staff';
        const name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
        await createStaffMember(
          placeholderStaffInput({
            name,
            email,
            phone: `04${String(index + 1).padStart(8, '0')}`,
            venueIds: [venueId],
          }),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'staff' && query.queryKey[1] === 'list',
      });
    },
  });
}

// Card 3 skip behaviour: "the roster builder in Card 4 should be
// pre-populated with placeholder staff so the owner can still explore the
// product". Implemented as real (clearly-named) StaffMember rows rather
// than client-only fake data, so the roster builder needs no special-casing
// to display them — same placeholder philosophy as the bulk invite above.
const PLACEHOLDER_STAFF = [
  { name: 'Alex Example', localPart: 'alex.example' },
  { name: 'Jordan Example', localPart: 'jordan.example' },
];

export function useSkipAddStaffWithPlaceholders(venueId: string) {
  const queryClient = useQueryClient();
  const setStepStatus = useOnboardingStore(s => s.setStepStatus);

  return useMutation({
    mutationFn: async () => {
      for (const [index, placeholder] of PLACEHOLDER_STAFF.entries()) {
        await createStaffMember(
          placeholderStaffInput({
            name: placeholder.name,
            email: `${placeholder.localPart}+${venueId.slice(0, 8)}@placeholder.hosporoster.invalid`,
            phone: `04${String(90 + index).padStart(8, '0')}`,
            venueIds: [venueId],
          }),
        );
      }
      await api.setOnboardingStepStatus(venueId, 'addStaff', 'skipped');
    },
    onMutate: () => setStepStatus('addStaff', 'skipped'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'staff' && query.queryKey[1] === 'list',
      });
      queryClient.invalidateQueries({ queryKey: ['home', 'onboarding-status', venueId] });
    },
  });
}
