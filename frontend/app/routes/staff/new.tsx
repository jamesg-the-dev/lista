import { useNavigate } from 'react-router';

import { useVenueContextStore } from '~/lib/venue-context';

import NewStaffMember from './components/NewStaffMember';
import { useVenues } from './hooks';
import { usePageTitle } from '~/lib/utils';

export default function StaffNewRoute() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenueContextStore();
  const venuesQuery = useVenues();
  usePageTitle('Staff | New Staff Member');

  return (
    <NewStaffMember
      venues={venuesQuery.data ?? []}
      defaultVenueId={activeVenueId}
      onBack={() => navigate('/staff')}
      onCreated={staffId => navigate(`/staff/${staffId}`, { replace: true })}
    />
  );
}
