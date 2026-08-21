import { useVenueContextStore } from '~/lib/venue-context';

import StaffRolesTab from './components/StaffRolesTab';

export default function StaffRolesRoute() {
  const { activeVenueId } = useVenueContextStore();
  if (!activeVenueId) return null;
  return <StaffRolesTab venueId={activeVenueId} />;
}
