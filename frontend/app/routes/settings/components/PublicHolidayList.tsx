import { useState } from 'react';
import { CalendarIcon, ChevronDownIcon, PlusIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { DatePickerSimple } from '~/components/ui/date-picker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Field, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

import {
  useAddVenueHolidayOverride,
  usePublicHolidays,
  useVenueHolidayOverrides,
} from '../hooks';
import { SectionHeader } from './form-ui';

const HORIZON_DAYS = 400; // covers the rest of this year plus a buffer into next

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

interface PublicHolidayListProps {
  venueId: string;
  state: string;
}

// Read-only system-maintained calendar (§2 AC3) — a short "next 3 upcoming"
// preview is always visible, with the full remaining list behind a "View
// all" expansion (per the spec's mockup), plus the rare owner-added
// venue-specific closure flow underneath.
export default function PublicHolidayList({ venueId, state }: PublicHolidayListProps) {
  const today = new Date();
  const from = formatDateOnly(today);
  const to = formatDateOnly(
    new Date(today.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000),
  );

  const holidaysQuery = usePublicHolidays(state, from, to);
  const overridesQuery = useVenueHolidayOverrides(venueId);
  const addOverrideMutation = useAddVenueHolidayOverride(venueId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string>(from);
  const [overrideName, setOverrideName] = useState('');

  const holidays = holidaysQuery.data ?? [];
  const upcoming = holidays.slice(0, 3);
  const remaining = holidays.slice(3);

  const handleAddOverride = async () => {
    if (!overrideName.trim()) return;
    await addOverrideMutation.mutateAsync({ overrideDate, name: overrideName.trim() });
    setOverrideName('');
    setDialogOpen(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader
          title={`Public holidays — ${state}`}
          subtitle="System-maintained — you can add venue-specific closures below, but this calendar itself is read-only."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon data-icon="inline-start" size={14} />
          Add venue-specific closure
        </Button>
      </div>

      {holidaysQuery.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {holidaysQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load the public holiday calendar</AlertTitle>
          <AlertDescription>
            {holidaysQuery.error instanceof Error
              ? holidaysQuery.error.message
              : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}

      {holidaysQuery.isSuccess && holidays.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No holidays on record yet for {state} in the coming year.
        </p>
      )}

      {holidaysQuery.isSuccess && upcoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {upcoming.map(holiday => (
            <div
              key={holiday.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm font-medium">{holiday.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatDisplayDate(holiday.date)}
              </span>
            </div>
          ))}
        </div>
      )}

      {remaining.length > 0 && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
            View all ({holidays.length})
            <ChevronDownIcon size={14} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>National</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map(holiday => (
                  <TableRow key={holiday.id}>
                    <TableCell className="tabular-nums">
                      {formatDisplayDate(holiday.date)}
                    </TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>{holiday.isNational ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {overridesQuery.isSuccess && overridesQuery.data.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Venue-specific closures
          </p>
          {overridesQuery.data.map(o => (
            <div
              key={o.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm font-medium">{o.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatDisplayDate(o.overrideDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {overridesQuery.isSuccess && overridesQuery.data.length === 0 && (
        <Empty className="border-border mt-4 rounded-lg border py-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyTitle>No venue-specific closures</EmptyTitle>
            <EmptyDescription>
              Add a one-off closure day (e.g. a private event) that isn't on the standard
              calendar above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add venue-specific closure</DialogTitle>
            <DialogDescription>
              Additive only — this supplements the public holiday calendar above, it
              doesn't replace it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <DatePickerSimple
              id="override-date"
              label="Date"
              value={parseDateOnly(overrideDate)}
              onChange={date => {
                if (date) {
                  setOverrideDate(formatDateOnly(date));
                }
              }}
            />

            <Field>
              <FieldLabel htmlFor="override-name">Closure name</FieldLabel>
              <Input
                id="override-name"
                placeholder="Private event"
                value={overrideName}
                onChange={e => setOverrideName(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleAddOverride}
              disabled={!overrideName.trim() || addOverrideMutation.isPending}
            >
              {addOverrideMutation.isPending ? 'Saving…' : 'Add closure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
