import { useVenueContextStore } from '~/lib/venue-context';

import StaffRolesTab from './components/StaffRolesTab';
import { usePageTitle } from '~/lib/utils';

export default function StaffRolesRoute() {
  const { activeVenueId } = useVenueContextStore();
  usePageTitle('Settings | Staff & Roles');
  if (!activeVenueId) return null;
  return <StaffRolesTab venueId={activeVenueId} />;
}
