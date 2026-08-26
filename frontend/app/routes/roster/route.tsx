import { Fragment, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Link } from 'react-router';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import { Spinner } from '~/components/ui/spinner';
import { useVenueContextStore } from '~/lib/venue-context';

import { BudgetBar } from './components/BudgetBar';
import { ComplianceBadge } from './components/ComplianceBadge';
import { CopyPreviousWeekButton } from './components/CopyPreviousWeekButton';
import type { ShiftEditorPanelState } from './components/ShiftEditorPanel';
import { ShiftEditorPanel } from './components/ShiftEditorPanel';
import {
  useBudgetSummary,
  useCreateShift,
  useDeleteShift,
  useOverrideComplianceViolation,
  useRolesForVenue,
  useSaveForecastSalesTarget,
  useShifts,
  useStaffMembers,
  useUpdateShift,
  useVenues,
} from './hooks';
import type { ComplianceViolationType, Role, Shift, ShiftDraft } from './types';
import {
  currency,
  currency2,
  dateForDay,
  groupShiftsByStaffDay,
  mustFindVenue,
  resolveStaffRate,
  roleColor,
  roleLetter,
  roleTint,
  shiftKey,
  totalAwardCost,
} from './types';
import { initials, usePageTitle } from '~/lib/utils';
import { DAY_LABELS } from '~/lib/date-types';

// Luxon's `weekday` (1=Monday..7=Sunday) is always ISO-based regardless of
// locale, unlike `startOf('week')` — matches this app's own Monday-first
// convention (DAY_LABELS, types.ts's dayOfWeekForDate).
const TODAY = DateTime.local().startOf('day');
const WEEK_START = TODAY.minus({ days: TODAY.weekday - 1 }); // Monday of the current week
const TODAY_INDEX = TODAY.weekday - 1; // 0=Mon..6=Sun

export default function RosterBuilder() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const [weekStart, setWeekStart] = useState(WEEK_START);
  const weekStartIso = weekStart.toISODate()!;
  const isViewingCurrentWeek = weekStartIso === WEEK_START.toISODate();

  const venuesQuery = useVenues();
  usePageTitle(
    `Roster | ${mustFindVenue(venuesQuery.data ?? [], activeVenueId)?.name ?? ''}`,
  );
  const staffQuery = useStaffMembers(activeVenueId);
  const rolesQuery = useRolesForVenue(activeVenueId);
  const shiftsQuery = useShifts(activeVenueId, weekStartIso);
  const budgetSummaryQuery = useBudgetSummary(activeVenueId, weekStartIso);

  const createShiftMutation = useCreateShift(activeVenueId, weekStartIso);
  const updateShiftMutation = useUpdateShift(activeVenueId, weekStartIso);
  const deleteShiftMutation = useDeleteShift(activeVenueId, weekStartIso);
  const saveForecastTargetMutation = useSaveForecastSalesTarget(
    activeVenueId,
    weekStartIso,
  );
  const overrideViolationMutation = useOverrideComplianceViolation(
    activeVenueId,
    weekStartIso,
  );

  const [panelOpen, setPanelOpen] = useState(false);
  const [panel, setPanel] = useState<ShiftEditorPanelState | null>(null);
  const [draft, setDraft] = useState<ShiftDraft>({
    start: '09:00',
    end: '17:00',
    unpaidBreakMinutes: 30,
  });

  const venues = venuesQuery.data ?? [];
  // Deactivated staff shouldn't be assignable to new shifts.
  const staff = useMemo(
    () => (staffQuery.data ?? []).filter(s => s.isActive),
    [staffQuery.data],
  );
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const rolesById = useMemo(() => new Map(roles.map(r => [r.id, r])), [roles]);
  const roleFor = (st: { primaryRoleId: string | null }): Role | undefined =>
    st.primaryRoleId ? rolesById.get(st.primaryRoleId) : undefined;
  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const shiftsByKey = useMemo(() => groupShiftsByStaffDay(shifts), [shifts]);

  // Per-day totals for the day-cost strip chart — summed from each shift's
  // own server-computed awardBreakdown (see CLAUDE.md's "reuses the
  // award-breakdown data already computed" rule for the budget bar). The
  // header BudgetBar's total instead reads budgetSummaryQuery's
  // server-aggregated totalCost directly, so the two aren't two competing
  // computations of the same number.
  const perDayTotals = useMemo(() => {
    const totals = new Array(7).fill(0);
    staff.forEach(st => {
      for (let d = 0; d < 7; d++) {
        const list = shiftsByKey[shiftKey(st.id, d)] ?? [];
        list.forEach(sh => {
          totals[d] += totalAwardCost(sh.awardBreakdown);
        });
      }
    });
    return totals;
  }, [staff, shiftsByKey]);

  const maxDay = Math.max(...perDayTotals, 1);

  function goToWeek(deltaWeeks: number) {
    setWeekStart(prev => prev.plus({ weeks: deltaWeeks }));
  }

  function openAdd(staffId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
    setDraft({ start: '09:00', end: '17:00', unpaidBreakMinutes: 30 });
    setPanel({ staffId, dayOfWeek, shift: null, draftId: crypto.randomUUID() });
    setPanelOpen(true);
  }
  function openEdit(staffId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6, shift: Shift) {
    setDraft({
      start: shift.start,
      end: shift.end,
      unpaidBreakMinutes: shift.unpaidBreakMinutes,
    });
    setPanel({ staffId, dayOfWeek, shift, draftId: shift.id });
    setPanelOpen(true);
  }
  function closePanel() {
    setPanelOpen(false);
  }

  async function handleSaveShift() {
    if (!panel) return;
    const panelStaffMember = staff.find(s => s.id === panel.staffId);
    if (!panelStaffMember) return;
    const { rate } = resolveStaffRate(panelStaffMember, roleFor(panelStaffMember));
    // The panel disables Save while the rate is unresolved (see
    // ShiftEditorPanel's canSave) — this is defense in depth, not the
    // primary guard.
    if (rate === null) return;
    const input = {
      venueId: activeVenueId,
      employeeId: panel.staffId,
      shiftDate: dateForDay(weekStart, panel.dayOfWeek).toISODate()!,
      baseRatePerHour: rate,
      ...draft,
    };
    if (panel.shift) {
      await updateShiftMutation.mutateAsync({ shiftId: panel.shift.id, input });
    } else {
      await createShiftMutation.mutateAsync(input);
    }
    closePanel();
  }

  async function handleDeleteShift() {
    if (!panel?.shift) return;
    await deleteShiftMutation.mutateAsync(panel.shift.id);
    closePanel();
  }

  // Keeps the panel open (unlike save/delete) and swaps in the updated shift
  // — the audit-logged override flips that violation's `acknowledged` flag
  // without touching anything else on the shift.
  async function handleOverrideViolation(
    violationType: ComplianceViolationType,
    reason: string,
  ) {
    if (!panel?.shift) return;
    const updated = await overrideViolationMutation.mutateAsync({
      shiftId: panel.shift.id,
      violationType,
      reason,
    });
    setPanel(prev => (prev ? { ...prev, shift: updated } : prev));
  }

  const panelStaff = panel ? (staff.find(s => s.id === panel.staffId) ?? null) : null;
  const panelRole = panelStaff ? (roleFor(panelStaff) ?? null) : null;

  if (
    venuesQuery.isLoading ||
    staffQuery.isLoading ||
    rolesQuery.isLoading ||
    shiftsQuery.isLoading
  ) {
    return (
      <div className="bg-background flex min-h-screen w-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (
    venuesQuery.isError ||
    staffQuery.isError ||
    rolesQuery.isError ||
    shiftsQuery.isError
  ) {
    return (
      <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
        <Empty>
          <EmptyTitle>Couldn't load the roster</EmptyTitle>
          <EmptyDescription>
            {(
              venuesQuery.error ??
              staffQuery.error ??
              rolesQuery.error ??
              shiftsQuery.error
            )?.message ?? 'Something went wrong. Try again shortly.'}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const venue = mustFindVenue(venues, activeVenueId);

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      {/* Top bar */}
      <header className="border-border bg-card sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
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
                  onClick={() => setActiveVenueId(v.id)}
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

          <div className="border-border hidden items-center gap-2 border-l pl-4 md:flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => goToWeek(-1)}
            >
              <ChevronLeftIcon size={18} />
            </Button>
            <span className="font-sans text-sm font-medium tabular-nums">
              {dateForDay(weekStart, 0).toFormat('d LLL')} –{' '}
              {dateForDay(weekStart, 6).toFormat('d LLL')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => goToWeek(1)}
            >
              <ChevronRightIcon size={18} />
            </Button>
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
            currentShiftCount={shifts.length}
          />
          <BudgetBar
            summary={budgetSummaryQuery.data}
            onSaveTarget={value => saveForecastTargetMutation.mutate(value)}
            savingTarget={saveForecastTargetMutation.isPending}
          />
        </div>
      </header>

      {/* Day cost strip */}
      <div className="border-border bg-background border-b px-6 py-3">
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((d, i) => {
            const isToday = isViewingCurrentWeek && i === TODAY_INDEX;
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

      {/* Grid */}
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
                      isViewingCurrentWeek && i === TODAY_INDEX
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
                                onClick={() => openEdit(st.id, dayOfWeek, sh)}
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
                            onClick={() => openAdd(st.id, dayOfWeek)}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-6 pb-6">
        {roles
          .filter(r => r.isActive)
          .map(r => (
            <div key={r.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: roleColor(r) }}
              />
              <span className="text-muted-foreground text-xs">{r.displayName}</span>
            </div>
          ))}
        <span className="text-muted-foreground ml-auto text-xs">
          Rates and compliance rules shown are illustrative for demo purposes — not
          authoritative payroll or legal advice.
        </span>
      </div>

      {/* Slide-over panel */}
      <ShiftEditorPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        panel={panel}
        staff={panelStaff}
        role={panelRole}
        weekStart={weekStart}
        draft={draft}
        onDraftChange={setDraft}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        saving={
          createShiftMutation.isPending ||
          updateShiftMutation.isPending ||
          deleteShiftMutation.isPending
        }
        onOverrideViolation={handleOverrideViolation}
        overridingViolationType={
          overrideViolationMutation.isPending
            ? (overrideViolationMutation.variables?.violationType ?? null)
            : null
        }
      />
    </div>
  );
}
