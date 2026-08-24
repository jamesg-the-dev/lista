import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { Textarea } from '~/components/ui/textarea';

import {
  useClearStaffPayRateOverride,
  useSaveStaffMember,
  useSetStaffPayRateOverride,
  useStaffMember,
  useUpdateStaffPermissionLevel,
} from '~/routes/staff/hooks';
import { PERMISSION_LEVEL_META } from '~/routes/staff/types';
import type { PermissionLevel } from '~/routes/staff/types';

import { useRolesForVenue } from '../hooks';

const PERMISSION_LEVEL_ITEMS = (
  Object.keys(PERMISSION_LEVEL_META) as PermissionLevel[]
).map(value => ({ value, label: PERMISSION_LEVEL_META[value].label }));

interface StaffEditDrawerProps {
  staffId: string;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Permission level and primary role commit immediately on change (single
// self-contained controls, per CLAUDE.md §3/§4 — no cross-field read needed
// at submit time). The pay rate override section is the one part with a
// real "read together at submit" shape (rate + reason), so it keeps a
// local Save step instead.
export default function StaffEditDrawer({
  staffId,
  venueId,
  open,
  onOpenChange,
}: StaffEditDrawerProps) {
  const staffQuery = useStaffMember(staffId);
  const rolesQuery = useRolesForVenue(venueId);
  const saveStaffMutation = useSaveStaffMember();
  const permissionMutation = useUpdateStaffPermissionLevel();
  const setOverrideMutation = useSetStaffPayRateOverride();
  const clearOverrideMutation = useClearStaffPayRateOverride();

  const staff = staffQuery.data;

  const [overrideRate, setOverrideRate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideDraftOpen, setOverrideDraftOpen] = useState(false);

  const roles = rolesQuery.data ?? [];

  const handleSaveOverride = async () => {
    const rate = Number(overrideRate);
    if (!rate || rate <= 0 || !overrideReason.trim()) return;
    await setOverrideMutation.mutateAsync({
      staffId,
      overrideHourlyRate: rate,
      reason: overrideReason.trim(),
    });
    setOverrideDraftOpen(false);
    setOverrideRate('');
    setOverrideReason('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{staff?.name ?? 'Staff member'}</SheetTitle>
          <SheetDescription>
            Permission level, pay rate override and primary role.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4">
          {staffQuery.isLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {staffQuery.isError && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't load this staff member</AlertTitle>
              <AlertDescription>
                {staffQuery.error instanceof Error
                  ? staffQuery.error.message
                  : 'Something went wrong.'}
              </AlertDescription>
            </Alert>
          )}

          {staff && (
            <>
              <Field>
                <FieldLabel htmlFor="drawer-permission-level">
                  Permission level
                </FieldLabel>
                <Select
                  items={PERMISSION_LEVEL_ITEMS}
                  value={staff.permissionLevel}
                  onValueChange={value =>
                    value !== null &&
                    permissionMutation.mutate({
                      staffId,
                      permissionLevel: value as PermissionLevel,
                    })
                  }
                >
                  <SelectTrigger id="drawer-permission-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PERMISSION_LEVEL_ITEMS.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {PERMISSION_LEVEL_META[staff.permissionLevel].description}
                </FieldDescription>
              </Field>

              {permissionMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {permissionMutation.error instanceof Error
                      ? permissionMutation.error.message
                      : "Couldn't update permission level."}
                  </AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="drawer-primary-role">Primary role</FieldLabel>
                <Select
                  items={roles.map(r => ({ value: r.id, label: r.displayName }))}
                  value={staff.primaryRoleId}
                  onValueChange={value =>
                    saveStaffMutation.mutate({
                      id: staff.id,
                      name: staff.name,
                      email: staff.email,
                      phone: staff.phone,
                      dateOfBirth: staff.dateOfBirth,
                      employmentType: staff.employmentType,
                      classification: staff.classification,
                      maxWeeklyHours: staff.maxWeeklyHours,
                      venueIds: staff.venueIds,
                      permissionLevel: staff.permissionLevel,
                      primaryRoleId: value,
                    })
                  }
                >
                  <SelectTrigger id="drawer-primary-role" className="w-full">
                    <SelectValue placeholder="No primary role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.displayName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The role this staff member is usually rostered under.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Pay rate override</FieldLabel>
                {staff.payRateOverride ? (
                  <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-success-tint text-success">
                        +${staff.payRateOverride.overrideHourlyRate.toFixed(2)}/hr above
                        award
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={clearOverrideMutation.isPending}
                        onClick={() => clearOverrideMutation.mutate(staffId)}
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {staff.payRateOverride.reason}
                    </p>
                  </div>
                ) : overrideDraftOpen ? (
                  <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Above-award hourly rate"
                      value={overrideRate}
                      onChange={e => setOverrideRate(e.target.value)}
                    />
                    <Textarea
                      placeholder="Reason (required) — e.g. Senior bartender, 5 yrs experience"
                      rows={2}
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOverrideDraftOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={
                          setOverrideMutation.isPending ||
                          !Number(overrideRate) ||
                          !overrideReason.trim()
                        }
                        onClick={handleSaveOverride}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setOverrideDraftOpen(true)}
                  >
                    Add override
                  </Button>
                )}
              </Field>
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
