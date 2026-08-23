import { apiClient } from '~/lib/api-client';
import type { VenueProfileDto } from '~/routes/settings/types';

import type { OnboardingStepKey, OnboardingStepStatus } from './types';
import { unmapOnboardingStep, unmapOnboardingStepStatus } from './types';

// Backed by VenueController's onboarding-status endpoints (backend/src/
// RosterApp.Api/Controllers/VenueController.cs). Both return the full
// VenueDto — reusing settings/types.ts's VenueProfileDto shape since it's
// the same wire type, not a separate onboarding-only response.

export function setOnboardingStepStatus(
  venueId: string,
  step: OnboardingStepKey,
  status: OnboardingStepStatus,
): Promise<VenueProfileDto> {
  return apiClient.post<VenueProfileDto>(`/api/venues/${venueId}/onboarding-status/steps`, {
    step: unmapOnboardingStep(step),
    status: unmapOnboardingStepStatus(status),
  });
}

export function dismissOnboardingChecklist(venueId: string): Promise<VenueProfileDto> {
  return apiClient.post<VenueProfileDto>(`/api/venues/${venueId}/onboarding-status/dismiss`);
}
