import type { DateTime } from 'luxon';

import { DAY_LABELS } from '~/lib/date-types';

import { currency, dateForDay } from '../types';

interface DayCostStripProps {
  weekStart: DateTime;
  perDayTotals: number[];
  isViewingCurrentWeek: boolean;
  todayIndex: number;
}

export function DayCostStrip({
  weekStart,
  perDayTotals,
  isViewingCurrentWeek,
  todayIndex,
}: DayCostStripProps) {
  const maxDay = Math.max(...perDayTotals, 1);

  return (
    <div className="border-border bg-background border-b px-6 py-3">
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((d, i) => {
          const isToday = isViewingCurrentWeek && i === todayIndex;
          const h = Math.max(6, (perDayTotals[i] / maxDay) * 28);
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 items-end">
                <div
                  className={`w-8 rounded-t ${isToday ? 'bg-foreground' : 'bg-muted'}`}
                  style={{ height: `${h}px` }}
                />
              </div>
              <p className="text-muted-foreground font-sans text-[11px] font-medium tabular-nums">
                {currency(perDayTotals[i])}
              </p>
              <p
                className={`font-sans text-xs font-semibold uppercase ${
                  isToday ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {d} {dateForDay(weekStart, i).day}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
