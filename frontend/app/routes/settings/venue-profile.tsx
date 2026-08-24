import { useNavigate, useSearchParams } from 'react-router';

import { useVenueContextStore } from '~/lib/venue-context';

import VenueProfileTab from './components/VenueProfileTab';
import { usePageTitle } from '~/lib/utils';

// ?firstTime=1 marks arrival straight from sign-up (docs/features/
// signup-feature.md Step 3) — the only case where this tab is
// skippable and redirects into the app on save, rather than just
// staying put as a normal settings tab.
export default function VenueProfileRoute() {
  const { activeVenueId } = useVenueContextStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFirstTime = searchParams.get('firstTime') === '1';
  usePageTitle('Settings | Venue Profile');
  if (!activeVenueId) return null;
  return (
    <VenueProfileTab
      venueId={activeVenueId}
      onSaved={isFirstTime ? () => navigate('/roster') : undefined}
      onSkip={isFirstTime ? () => navigate('/roster') : undefined}
    />
  );
}
