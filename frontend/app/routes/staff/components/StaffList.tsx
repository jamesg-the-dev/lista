import { useNavigate } from 'react-router';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, UsersIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Skeleton } from '~/components/ui/skeleton';
import { useVenueContextStore } from '~/lib/venue-context';

import { useStaffMembers, useVenues } from '../hooks';
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
      className="h-auto w-full items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 text-left"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-sans text-sm font-bold text-foreground">
          {initials(staff.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{staff.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {classification.label} · {classification.description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded bg-muted px-2 py-1 font-sans text-xs font-medium tabular-nums text-muted-foreground">
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive bg-destructive-tint p-10 text-center">
      <p className="text-sm font-medium text-destructive">
        Couldn't load staff for this venue
      </p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
      <UsersIcon size={20} className="text-muted-foreground" />
      <p className="text-sm font-medium">No staff assigned to this venue yet</p>
      <p className="text-xs text-muted-foreground">
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
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();

  const venuesQuery = useVenues();
  const staffQuery = useStaffMembers(activeVenueId);

  const activeVenue = venuesQuery.data?.find(v => v.id === activeVenueId);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto gap-2 rounded-lg bg-muted px-3 py-2"
                />
              }
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
              <div className="text-left">
                <p className="font-sans text-sm leading-tight font-semibold uppercase">
                  {activeVenue?.name ?? 'Loading venue…'}
                </p>
              </div>
              <ChevronDownIcon size={14} className="ml-1 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-muted">
              {(venuesQuery.data ?? []).map(v => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => setActiveVenueId(v.id)}
                  className="justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                  </div>
                  {v.id === activeVenueId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden border-l border-border pl-4 md:block">
            <p className="font-sans text-sm font-semibold">Staff & availability</p>
            <p className="text-xs text-muted-foreground">
              Profiles, pay tiers and leave for this venue
            </p>
          </div>
        </div>

        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={() => navigate('/staff/new')}
        >
          <PlusIcon size={14} />
          Add staff member
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
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
        </div>
      </main>
    </div>
  );
}
