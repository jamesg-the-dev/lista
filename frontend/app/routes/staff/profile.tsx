import { useNavigate, useParams } from 'react-router';

import StaffProfile from './components/StaffProfile';
import { useStaffMember, useVenues } from './hooks';
import { usePageTitle } from '~/lib/utils';

export default function StaffProfileRoute() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const venuesQuery = useVenues();

  if (!staffId) {
    throw new Error('staff/:staffId route rendered without a staffId param');
  }

  const staffQuery = useStaffMember(staffId);

  usePageTitle(`Staff | ${staffQuery.data?.name ?? ''}`);

  return (
    <StaffProfile
      staffId={staffId}
      venues={venuesQuery.data ?? []}
      onBack={() => navigate('/staff')}
    />
  );
}
