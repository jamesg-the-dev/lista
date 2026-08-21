import { useVenueContextStore } from '~/lib/venue-context';

import RosterRulesTab from './components/RosterRulesTab';

export default function RosterRulesRoute() {
  const { activeVenueId } = useVenueContextStore();
  if (!activeVenueId) return null;
  return <RosterRulesTab venueId={activeVenueId} />;
}
