import { useNavigate } from 'react-router';
import { ChevronRightIcon, UsersIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useVenueContextStore } from '~/lib/venue-context';

import { useStaffMembers } from '../hooks';
import { CLASSIFICATION_META, EMPLOYMENT_TYPE_META } from '../types';
import type { StaffMember } from '../types';
import { initials } from '~/lib/utils';

function StaffRow({ staff, onSelect }: { staff: StaffMember; onSelect: () => void }) {
  const classification = CLASSIFICATION_META[staff.classification];
  const employmentType = EMPLOYMENT_TYPE_META[staff.employmentType];
  return (
    <Button
      variant="outline"
      onClick={onSelect}
      className="bg-card h-auto w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold">
          {initials(staff.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{staff.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {classification.label} · {classification.description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="bg-muted text-muted-foreground rounded px-2 py-1 font-sans text-xs font-medium tabular-nums">
          {employmentType.label}
        </span>
        <ChevronRightIcon size={16} className="text-muted-foreground" />
      </div>
    </Button>
  );
}

function StaffListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map(i => (
        <Skeleton key={i} className="h-15 rounded-lg" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-destructive bg-destructive-tint flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-destructive text-sm font-medium">
        Couldn't load staff for this venue
      </p>
      <p className="text-muted-foreground text-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <UsersIcon size={20} className="text-muted-foreground" />
      <p className="text-sm font-medium">No staff assigned to this venue yet</p>
      <p className="text-muted-foreground text-xs">
        Add a staff member to start building this venue's roster.
      </p>
      <Button variant="default" size="sm" onClick={onAdd}>
        Add staff member
      </Button>
    </div>
  );
}

export default function StaffList() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenueContextStore();

  const staffQuery = useStaffMembers(activeVenueId);

  return (
    <>
      {staffQuery.isLoading && <StaffListSkeleton />}
      {staffQuery.isError && (
        <ErrorState
          message={
            staffQuery.error instanceof Error
              ? staffQuery.error.message
              : 'Something went wrong.'
          }
          onRetry={() => staffQuery.refetch()}
        />
      )}
      {staffQuery.isSuccess && staffQuery.data.length === 0 && (
        <EmptyState onAdd={() => navigate('/staff/new')} />
      )}
      {staffQuery.isSuccess &&
        staffQuery.data.map(staff => (
          <StaffRow
            key={staff.id}
            staff={staff}
            onSelect={() => navigate(`/staff/${staff.id}`)}
          />
        ))}
    </>
  );
}
