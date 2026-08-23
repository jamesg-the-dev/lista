import { useSearchParams } from 'react-router';

import { useSetOnboardingStepStatus } from '~/routes/home/hooks';
import { useVenueContextStore } from '~/lib/venue-context';

import VenueProfileTab from './components/VenueProfileTab';
import { usePageTitle } from '~/lib/utils';

export default function VenueProfileRoute() {
  const { activeVenueId } = useVenueContextStore();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('onboarding') === '1';
  const setOnboardingStepStatus = useSetOnboardingStepStatus(activeVenueId);
  usePageTitle('Settings | Venue Profile');
  if (!activeVenueId) return null;
  return (
    <VenueProfileTab
      venueId={activeVenueId}
      onSaved={
        fromOnboarding
          ? () => setOnboardingStepStatus.mutate({ step: 'venueProfile', status: 'completed' })
          : undefined
      }
    />
  );
}
