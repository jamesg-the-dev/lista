import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/components/ui/toast';
import { getApiErrorMessage } from '~/lib/api-client';

import { useSaveStaffMember, useStaffMember } from '../hooks';
import type { Venue } from '../types';
import StaffMemberForm, {
  blankStaffMemberForm,
  toStaffMemberFormValue,
} from './StaffMemberForm';
import { LeaveRequestsSection } from './LeaveRequestSection';
import { AvailabilitySection } from './AvailabilitySection';

interface StaffProfileProps {
  staffId: string;
  venues: Venue[];
  onBack: () => void;
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-destructive bg-destructive-tint flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-destructive text-sm font-medium">Couldn't load this profile</p>
      <p className="text-muted-foreground text-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function StaffProfileSkeleton() {
  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export default function StaffProfile({ staffId, venues, onBack }: StaffProfileProps) {
  const staffQuery = useStaffMember(staffId);
  const saveMutation = useSaveStaffMember();

  const form = useForm({
    defaultValues: staffQuery.data
      ? toStaffMemberFormValue(staffQuery.data)
      : blankStaffMemberForm(''),
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync({ id: staffId, ...value });
    },
  });
  // Reset the form when the loaded staff record changes, following React's
  // "adjust state during render" pattern instead of an Effect — avoids an
  // extra render pass just to sync from query data.
  const [syncedStaffId, setSyncedStaffId] = useState<string | null>(null);
  if (staffQuery.data && staffQuery.data.id !== syncedStaffId) {
    setSyncedStaffId(staffQuery.data.id);
    form.reset(toStaffMemberFormValue(staffQuery.data));
  }

  const staff = staffQuery.data;

  useEffect(() => {
    if (saveMutation.isError) {
      toast.add({
        title: "Couldn't save this profile",
        description: getApiErrorMessage(saveMutation.error),
        type: 'error',
      });
    }
  }, [saveMutation.isError, saveMutation.error]);

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      <header className="border-border bg-card sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            Back
          </Button>
          <div className="border-border min-w-0 border-l pl-4">
            <p className="text-muted-foreground font-sans text-xs font-semibold tracking-widest uppercase">
              Staff profile
            </p>
            <p className="truncate text-base font-medium">{staff?.name ?? '…'}</p>
          </div>
        </div>
        <Button
          variant="default"
          className="font-semibold"
          onClick={() => form.handleSubmit()}
          disabled={
            saveMutation.isPending ||
            staffQuery.isLoading ||
            staffQuery.isError ||
            !syncedStaffId
          }
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {staffQuery.isLoading && <StaffProfileSkeleton />}

          {staffQuery.isError && (
            <ErrorBlock
              message={
                staffQuery.error instanceof Error
                  ? staffQuery.error.message
                  : 'Something went wrong.'
              }
              onRetry={() => staffQuery.refetch()}
            />
          )}

          {!staffQuery.isLoading && !staffQuery.isError && staff && syncedStaffId && (
            <>
              <StaffMemberForm form={form} venues={venues} />

              <AvailabilitySection staffId={staffId} exceptions={staff.unavailability} />

              <LeaveRequestsSection
                staffId={staffId}
                leaveRequests={staff.leaveRequests}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
