import { AlertTriangleIcon, CheckIcon } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';

import {
  useAwardClassifications,
  useRolesForVenue,
  useSetRoleAwardMapping,
} from '../hooks';
import { SectionHeader } from './form-ui';

// Same underlying data as RoleList's mapping status pill (Staff & Roles
// tab) — this is the Award & Pay side of the same feature, per
// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §7's mockup: "one row per Role, each
// row a Select of classifications scoped to the currently selected award."
export default function RoleAwardMappingTable({
  venueId,
  awardId,
}: {
  venueId: string;
  awardId: string | undefined;
}) {
  const rolesQuery = useRolesForVenue(venueId);
  const classificationsQuery = useAwardClassifications(awardId);
  const setMappingMutation = useSetRoleAwardMapping(venueId);

  const roles = rolesQuery.data ?? [];
  const classifications = classificationsQuery.data ?? [];

  return (
    <section>
      <SectionHeader
        title="Role → Award Classification Mapping"
        subtitle="Roles are created and named in Staff & Roles — map each one to an award classification here."
      />

      {rolesQuery.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {rolesQuery.isSuccess && roles.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No roles yet — create roles in the Staff &amp; Roles tab, then map them here.
        </p>
      )}

      {roles.length > 0 && (
        <div className="flex flex-col gap-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {role.displayName}
              </span>
              <Select
                items={classifications.map(c => ({ value: c.id, label: c.name }))}
                value={role.mappedAwardClassificationId}
                onValueChange={value =>
                  value !== null &&
                  setMappingMutation.mutate({
                    roleId: role.id,
                    awardClassificationId: value,
                  })
                }
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="(not mapped)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {classifications.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {role.mappedAwardClassificationId ? (
                <CheckIcon size={16} className="text-success shrink-0" />
              ) : (
                <AlertTriangleIcon size={16} className="text-destructive shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
