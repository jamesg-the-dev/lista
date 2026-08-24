import { useVenueContextStore } from '~/lib/venue-context';

import VenueProfileTab from './components/VenueProfileTab';
import { usePageTitle } from '~/lib/utils';

export default function VenueProfileRoute() {
  const { activeVenueId } = useVenueContextStore();
  usePageTitle('Settings | Venue Profile');
  if (!activeVenueId) return null;
  return <VenueProfileTab venueId={activeVenueId} />;
}
