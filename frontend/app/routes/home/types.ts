// Setup checklist (Onboarding Feed pattern) — backed by VenueController's
// onboarding-status endpoints and the OnboardingStatus slice of VenueDto.
// See docs/features/FEATURE_ONBOARDING_FLOW.md and
// backend/src/RosterApp.Domain/Tenancy/VenueOnboardingStatus.cs.
//
// Reuses VenueProfileDto from the settings route (via fetchVenueProfile)
// rather than duplicating a fetch — the onboarding status is one field on
// the same Venue read model — but maps only the slice this route cares
// about into its own view model, per CLAUDE.md's "map once at the
// boundary" rule.

import type { VenueOnboardingStatusDto } from '~/routes/settings/types';

export const ONBOARDING_STEP_KEYS = [
  'venueProfile',
  'awardPaySetup',
  'addStaff',
  'buildFirstRoster',
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export type OnboardingStepStatus = 'pending' | 'completed' | 'skipped';

const STEP_KEY_WIRE: Record<OnboardingStepKey, string> = {
  venueProfile: 'VenueProfile',
  awardPaySetup: 'AwardPaySetup',
  addStaff: 'AddStaff',
  buildFirstRoster: 'BuildFirstRoster',
};

export function unmapOnboardingStep(step: OnboardingStepKey): string {
  return STEP_KEY_WIRE[step];
}

const STEP_STATUS_TABLE: Record<string, OnboardingStepStatus> = {
  Pending: 'pending',
  Completed: 'completed',
  Skipped: 'skipped',
};
const STEP_STATUS_REVERSE: Record<OnboardingStepStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  skipped: 'Skipped',
};

function mapStepStatus(wire: string): OnboardingStepStatus {
  const mapped = STEP_STATUS_TABLE[wire];
  if (mapped === undefined) {
    throw new Error(`Unknown OnboardingStepState wire value: ${wire}`);
  }
  return mapped;
}

export function unmapOnboardingStepStatus(status: OnboardingStepStatus): string {
  return STEP_STATUS_REVERSE[status];
}

export interface OnboardingStatus {
  venueProfile: OnboardingStepStatus;
  awardPaySetup: OnboardingStepStatus;
  addStaff: OnboardingStepStatus;
  buildFirstRoster: OnboardingStepStatus;
  checklistDismissed: boolean;
}

export function mapOnboardingStatus(dto: VenueOnboardingStatusDto): OnboardingStatus {
  return {
    venueProfile: mapStepStatus(dto.venueProfile),
    awardPaySetup: mapStepStatus(dto.awardPaySetup),
    addStaff: mapStepStatus(dto.addStaff),
    buildFirstRoster: mapStepStatus(dto.buildFirstRoster),
    checklistDismissed: dto.checklistDismissed,
  };
}

export function completedStepCount(status: OnboardingStatus): number {
  return ONBOARDING_STEP_KEYS.filter(key => status[key] === 'completed').length;
}

// "complete or skipped" — distinct from completedStepCount, which only
// counts genuinely completed steps for the "X of 4 complete" progress
// label. Used to decide when the checklist becomes collapsible (spec:
// "dismissible/collapsible once all steps are complete or skipped").
export function allStepsResolved(status: OnboardingStatus): boolean {
  return ONBOARDING_STEP_KEYS.every(key => status[key] !== 'pending');
}
