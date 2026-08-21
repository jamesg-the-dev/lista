import { useNavigate } from 'react-router';

import { useVenueContextStore } from '~/lib/venue-context';

import NewStaffMember from './components/NewStaffMember';
import { useVenues } from './hooks';

export default function StaffNewRoute() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenueContextStore();
  const venuesQuery = useVenues();

  return (
    <NewStaffMember
      venues={venuesQuery.data ?? []}
      defaultVenueId={activeVenueId}
      onBack={() => navigate('/staff')}
      onCreated={staffId => navigate(`/staff/${staffId}`, { replace: true })}
    />
  );
}
