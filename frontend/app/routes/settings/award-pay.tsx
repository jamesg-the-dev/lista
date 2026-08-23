import { useSearchParams } from 'react-router';

import { useSetOnboardingStepStatus } from '~/routes/home/hooks';
import { useVenueContextStore } from '~/lib/venue-context';

import AwardPayTab from './components/AwardPayTab';
import { usePageTitle } from '~/lib/utils';

export default function AwardPayRoute() {
  const { activeVenueId } = useVenueContextStore();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('onboarding') === '1';
  const setOnboardingStepStatus = useSetOnboardingStepStatus(activeVenueId);
  usePageTitle('Settings | Award & Pay');
  if (!activeVenueId) return null;
  return (
    <AwardPayTab
      venueId={activeVenueId}
      onSaved={
        fromOnboarding
          ? () => setOnboardingStepStatus.mutate({ step: 'awardPaySetup', status: 'completed' })
          : undefined
      }
    />
  );
}
