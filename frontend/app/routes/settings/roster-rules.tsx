import { useVenueContextStore } from '~/lib/venue-context';

import RosterRulesTab from './components/RosterRulesTab';
import { usePageTitle } from '~/lib/utils';

export default function RosterRulesRoute() {
  const { activeVenueId } = useVenueContextStore();
  usePageTitle('Settings | Roster Rules');
  if (!activeVenueId) return null;
  return <RosterRulesTab venueId={activeVenueId} />;
}
