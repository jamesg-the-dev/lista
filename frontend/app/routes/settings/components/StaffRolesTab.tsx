import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

import AvailabilitySettingsCard from './AvailabilitySettingsCard';
import RoleList from './RoleList';
import StaffTable from './StaffTable';

// Settings → Staff & Roles (docs/features/FEATURE_SETTINGS_STAFF_ROLES.md).
// The busiest of the four settings tabs, per §7 — split into three clearly
// separated sub-sections within one tab (roles, staff, availability) rather
// than further nested tabs.
export default function StaffRolesTab({ venueId }: { venueId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff & Roles</CardTitle>
        <CardDescription>
          Custom roles with award mapping baked into creation, permission levels and pay
          overrides.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          <RoleList venueId={venueId} />
          <Separator />
          <StaffTable venueId={venueId} />
          <Separator />
          <AvailabilitySettingsCard venueId={venueId} />
        </div>
      </CardContent>
    </Card>
  );
}
