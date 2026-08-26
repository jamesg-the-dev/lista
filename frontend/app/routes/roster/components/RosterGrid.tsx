import { Fragment } from 'react';
import { Link } from 'react-router';
import { PlusIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import { initials } from '~/lib/utils';
import { DAY_LABELS } from '~/lib/date-types';

import { ComplianceBadge } from './ComplianceBadge';
import {
  currency2,
  roleColor,
  roleLetter,
  roleTint,
  shiftKey,
  totalAwardCost,
} from '../types';
import type { Role, Shift, ShiftsByKey, StaffMember, Venue } from '../types';

interface RosterGridProps {
  venue: Venue;
  staff: StaffMember[];
  roleFor: (st: { primaryRoleId: string | null }) => Role | undefined;
  shiftsByKey: ShiftsByKey;
  isViewingCurrentWeek: boolean;
  todayIndex: number;
  onOpenAdd: (staffId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  onOpenEdit: (
    staffId: string,
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    shift: Shift,
  ) => void;
}

export function RosterGrid({
  venue,
  staff,
  roleFor,
  shiftsByKey,
  isViewingCurrentWeek,
  todayIndex,
  onOpenAdd,
  onOpenEdit,
}: RosterGridProps) {
  return (
    <main className="flex-1 overflow-x-auto px-6 py-6">
      {staff.length === 0 ? (
        <Empty>
          <EmptyTitle>No staff assigned to this venue</EmptyTitle>
          <EmptyDescription>
            Assign staff to {venue.name} from the Staff screen first.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="min-w-250">
          <div className="grid" style={{ gridTemplateColumns: '220px repeat(7, 1fr)' }}>
            <div />
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="pb-3 text-center">
                <p
                  className={`font-sans text-xs font-semibold tracking-widest uppercase ${
                    isViewingCurrentWeek && i === todayIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {d}
                </p>
              </div>
            ))}

            {staff.map(st => {
              const role = roleFor(st);
              const color = roleColor(role);
              const tint = roleTint(role);
              const letter = roleLetter(role);
              return (
                <Fragment key={st.id}>
                  <div className="border-border flex items-center gap-3 border-t py-3 pr-4">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold"
                      style={{ background: tint, color }}
                    >
                      {initials(st.name)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/staff/${st.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {st.name}
                      </Link>
                      <p className="truncate text-xs" style={{ color }}>
                        {role?.displayName ?? 'No role assigned'}
                      </p>
                    </div>
                  </div>

                  {DAY_LABELS.map((_, dayIdx) => {
                    const dayOfWeek = dayIdx as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                    const key = shiftKey(st.id, dayIdx);
                    const list = shiftsByKey[key] ?? [];
                    return (
                      <div
                        key={key}
                        className="border-border flex flex-col gap-1.5 border-t px-1.5 py-2"
                      >
                        {list.map(sh => (
                          <div key={sh.id} className="relative">
                            <Button
                              variant="outline"
                              onClick={() => onOpenEdit(st.id, dayOfWeek, sh)}
                              className="bg-card h-auto w-full items-stretch justify-start gap-0 overflow-hidden rounded-lg p-0 text-left"
                            >
                              <div
                                className="flex w-6 shrink-0 items-center justify-center font-sans text-xs font-bold"
                                style={{
                                  background: color,
                                  color: tint,
                                }}
                              >
                                {letter}
                              </div>
                              <div className="min-w-0 px-2 py-1.5">
                                <p className="font-sans text-xs leading-tight font-medium tabular-nums">
                                  {sh.start}–{sh.end}
                                </p>
                                <p className="text-muted-foreground font-sans text-[10px] font-medium tabular-nums">
                                  {currency2(totalAwardCost(sh.awardBreakdown))}
                                </p>
                              </div>
                            </Button>
                            {sh.complianceViolations.length > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 z-10">
                                <ComplianceBadge violations={sh.complianceViolations} />
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onOpenAdd(st.id, dayOfWeek)}
                          className="border-border text-muted-foreground h-auto w-full rounded-lg border border-dashed py-2"
                        >
                          <PlusIcon size={14} />
                        </Button>
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
