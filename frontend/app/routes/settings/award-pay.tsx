import { useVenueContextStore } from '~/lib/venue-context';

import AwardPayTab from './components/AwardPayTab';

export default function AwardPayRoute() {
  const { activeVenueId } = useVenueContextStore();
  if (!activeVenueId) return null;
  return <AwardPayTab venueId={activeVenueId} />;
}
