import { useState } from 'react';
import { MoreVerticalIcon, UsersIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

import { PERMISSION_LEVEL_META } from '~/routes/staff/types';
import { useStaffMembers } from '~/routes/staff/hooks';

import { useRolesForVenue } from '../hooks';
import { SectionHeader } from './form-ui';
import StaffEditDrawer from './StaffEditDrawer';

export default function StaffTable({ venueId }: { venueId: string }) {
  const staffQuery = useStaffMembers(venueId);
  const rolesQuery = useRolesForVenue(venueId);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const staff = staffQuery.data ?? [];
  const rolesById = new Map((rolesQuery.data ?? []).map(r => [r.id, r]));

  return (
    <section>
      <SectionHeader
        title="Staff"
        subtitle="Permission level and pay rate overrides. Add or edit full profiles from the Staff & availability screen."
      />

      {staffQuery.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {staffQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load staff for this venue</AlertTitle>
          <AlertDescription>
            {staffQuery.error instanceof Error
              ? staffQuery.error.message
              : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}

      {staffQuery.isSuccess && staff.length === 0 && (
        <Empty className="border-border rounded-lg border py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No staff yet</EmptyTitle>
            <EmptyDescription>
              Add staff members from the Staff &amp; availability screen — they'll appear
              here once created.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {staff.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="w-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map(member => {
              const role = member.primaryRoleId
                ? rolesById.get(member.primaryRoleId)
                : undefined;
              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role?.displayName ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PERMISSION_LEVEL_META[member.permissionLevel].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.payRateOverride ? (
                      <Badge className="bg-success-tint text-success">
                        +${member.payRateOverride.overrideHourlyRate.toFixed(2)}/hr
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Award
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreVerticalIcon size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingStaffId(member.id)}>
                          Edit permission & pay
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {editingStaffId && (
        <StaffEditDrawer
          key={editingStaffId}
          staffId={editingStaffId}
          venueId={venueId}
          open
          onOpenChange={open => !open && setEditingStaffId(null)}
        />
      )}
    </section>
  );
}
