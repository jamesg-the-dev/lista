import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useVenueContextStore } from '~/lib/venue-context';

import OnboardingChecklist from './components/OnboardingChecklist';
import { useOnboardingStatus } from './hooks';
import { useOnboardingStore } from './store';

// Index route (FEATURE_ONBOARDING_FLOW.md Phase 2) — the setup checklist
// lives here "as the dashboard itself" until dismissed, then this route
// falls back to its pre-onboarding behaviour of sending managers straight
// into the roster builder. This intentionally leaves the separate
// dashboard/route.tsx (Labour Cost Dashboard, CLAUDE.md build-order step 4)
// alone — that is a different, later-stage screen, not what onboarding
// re-purposes.
export default function Home() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenueContextStore();
  const statusQuery = useOnboardingStatus(activeVenueId);
  const hydrate = useOnboardingStore(s => s.hydrate);

  // Hydrate the Zustand store from the server-persisted status once per
  // venue, following the same "adjust state during render" sync pattern as
  // VenueProfileTab.tsx's syncedVenueId (rather than an Effect) — see
  // CLAUDE.md's state management notes.
  const [syncedVenueId, setSyncedVenueId] = useState<string | null>(null);
  if (statusQuery.data && syncedVenueId !== activeVenueId) {
    setSyncedVenueId(activeVenueId);
    hydrate(statusQuery.data);
  }

  const dismissed = statusQuery.data?.checklistDismissed ?? false;

  useEffect(() => {
    if (dismissed) {
      navigate('/roster', { replace: true });
    }
  }, [dismissed, navigate]);

  if (!activeVenueId || statusQuery.isLoading || dismissed) {
    return null;
  }

  return <OnboardingChecklist venueId={activeVenueId} />;
}
