import type { DateTime } from 'luxon';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

import { BudgetBar } from './BudgetBar';
import { CopyPreviousWeekButton } from './CopyPreviousWeekButton';
import { dateForDay } from '../types';
import type { BudgetSummary, Venue } from '../types';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

interface RosterHeaderProps {
  venues: Venue[];
  activeVenueId: string;
  venue: Venue;
  onVenueChange: (venueId: string) => void;
  weekStart: DateTime;
  weekStartIso: string;
  onGoToWeek: (deltaWeeks: number) => void;
  currentShiftCount: number;
  budgetSummary: BudgetSummary | undefined;
  onSaveTarget: (value: number | null) => void;
  savingTarget: boolean;
}

export function RosterHeader({
  venues,
  activeVenueId,
  venue,
  onVenueChange,
  weekStart,
  weekStartIso,
  onGoToWeek,
  currentShiftCount,
  budgetSummary,
  onSaveTarget,
  savingTarget,
}: RosterHeaderProps) {
  return (
    <header className="border-border bg-card sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        {venues.length > 1 && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="bg-muted h-auto gap-2 rounded-lg px-3 py-2"
                  />
                }
              >
                <span className="bg-foreground h-2 w-2 shrink-0 rounded-full" />
                <div className="text-left">
                  <p className="font-sans text-sm leading-tight font-semibold uppercase">
                    {venue.name}
                  </p>
                </div>
                <ChevronDownIcon
                  size={14}
                  className="text-muted-foreground ml-1 shrink-0"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-muted w-64">
                {venues.map(v => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => onVenueChange(v.id)}
                    className="justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                    </div>
                    {v.id === activeVenueId && (
                      <span className="bg-foreground h-1.5 w-1.5 rounded-full" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Separator orientation="vertical" className="mr-2" />
          </>
        )}

        <div className="hidden items-center gap-2 md:flex">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => onGoToWeek(-1)}
              >
                <ChevronLeftIcon size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous week</TooltipContent>
          </Tooltip>
          <span className="font-sans text-sm font-medium tabular-nums">
            {dateForDay(weekStart, 0).toFormat('d LLL')} –{' '}
            {dateForDay(weekStart, 6).toFormat('d LLL')}
          </span>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => onGoToWeek(1)}
              >
                <ChevronRightIcon size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next week</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right lg:block">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Award engine
          </p>
          <p className="text-xs font-medium">Hospitality Industry General Award</p>
        </div>
        <CopyPreviousWeekButton
          venueId={activeVenueId}
          weekStartIso={weekStartIso}
          previousWeekLabel={dateForDay(weekStart.minus({ weeks: 1 }), 0).toFormat(
            'd LLL',
          )}
          currentShiftCount={currentShiftCount}
        />

        <BudgetBar
          summary={budgetSummary}
          onSaveTarget={onSaveTarget}
          savingTarget={savingTarget}
        />
      </div>
    </header>
  );
}
