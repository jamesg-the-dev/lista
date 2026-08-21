import { useState } from 'react';
import { CopyIcon, InboxIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  Dialog,
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
import { Spinner } from '~/components/ui/spinner';

import { useDuplicateRoster, usePreviousWeekRoster } from '../hooks';

interface CopyPreviousWeekButtonProps {
  venueId: string;
  weekStartIso: string;
  previousWeekLabel: string;
  currentShiftCount: number;
}

export function CopyPreviousWeekButton({
  venueId,
  weekStartIso,
  previousWeekLabel,
  currentShiftCount,
}: CopyPreviousWeekButtonProps) {
  const [open, setOpen] = useState(false);
  const previousWeek = usePreviousWeekRoster(venueId, weekStartIso, open);
  const copyMutation = useDuplicateRoster(venueId, weekStartIso);

  const shifts = previousWeek.data ?? [];

  function handleConfirm() {
    copyMutation.mutate(undefined, {
      onSuccess: () => setOpen(false),
    });
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <CopyIcon data-icon="inline-start" />
        Copy previous week
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy previous week</DialogTitle>
            <DialogDescription>
              Starts this week's roster from the week of {previousWeekLabel}. You can edit
              freely afterwards — this doesn't stay linked to the original week.
            </DialogDescription>
          </DialogHeader>

          {previousWeek.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : shifts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No previous week roster</EmptyTitle>
                <EmptyDescription>
                  There's no published roster for the week of {previousWeekLabel} yet for
                  this venue.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <p className="text-muted-foreground text-sm">
              This will copy <strong className="text-foreground">{shifts.length}</strong>{' '}
              {shifts.length === 1 ? 'shift' : 'shifts'} from {previousWeekLabel} into
              this week
              {currentShiftCount > 0 && (
                <>
                  , replacing the{' '}
                  <strong className="text-foreground">{currentShiftCount}</strong>{' '}
                  {currentShiftCount === 1 ? 'shift' : 'shifts'} already on this week's
                  draft
                </>
              )}
              .
            </p>
          )}

          <DialogFooter>
            <Button
              onClick={handleConfirm}
              disabled={shifts.length === 0 || copyMutation.isPending}
            >
              {copyMutation.isPending && <Spinner data-icon="inline-start" />}
              Copy {shifts.length > 0 ? shifts.length : ''}{' '}
              {shifts.length === 1 ? 'shift' : 'shifts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
