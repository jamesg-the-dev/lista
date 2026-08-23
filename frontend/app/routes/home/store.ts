import { create } from 'zustand';

import type { OnboardingStatus, OnboardingStepKey, OnboardingStepStatus } from './types';

// Cross-cutting client state per CLAUDE.md § State management — the
// checklist's progress bar, the per-card completed/skipped styling, and the
// "build first roster" card's placeholder-staff decision all need to read
// the same step statuses without a parent/child relationship, and the spec
// calls for instant UI feedback (no loading spinner per card
// expand/collapse) ahead of the server round-trip. Hydrated from the
// server-persisted VenueOnboardingStatus on load (see home/route.tsx);
// mutations in home/hooks.ts update this optimistically, then reconcile
// once the server call resolves.
interface OnboardingStoreState extends OnboardingStatus {
  hydrated: boolean;
  hydrate: (status: OnboardingStatus) => void;
  setStepStatus: (step: OnboardingStepKey, status: OnboardingStepStatus) => void;
  dismiss: () => void;
}

const initialStatus: OnboardingStatus = {
  venueProfile: 'pending',
  awardPaySetup: 'pending',
  addStaff: 'pending',
  buildFirstRoster: 'pending',
  checklistDismissed: false,
};

export const useOnboardingStore = create<OnboardingStoreState>(set => ({
  ...initialStatus,
  hydrated: false,
  hydrate: status => set({ ...status, hydrated: true }),
  setStepStatus: (step, status) => set({ [step]: status }),
  dismiss: () => set({ checklistDismissed: true }),
}));
