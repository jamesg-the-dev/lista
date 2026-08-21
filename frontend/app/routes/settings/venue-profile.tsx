import { useVenueContextStore } from '~/lib/venue-context';

import VenueProfileTab from './components/VenueProfileTab';

export default function VenueProfileRoute() {
  const { activeVenueId } = useVenueContextStore();
  if (!activeVenueId) return null;
  return <VenueProfileTab venueId={activeVenueId} />;
}
