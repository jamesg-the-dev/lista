import { useVenueContextStore } from '~/lib/venue-context';

import AwardPayTab from './components/AwardPayTab';
import { usePageTitle } from '~/lib/utils';

export default function AwardPayRoute() {
  const { activeVenueId } = useVenueContextStore();
  usePageTitle('Settings | Award & Pay');
  if (!activeVenueId) return null;
  return <AwardPayTab venueId={activeVenueId} />;
}
