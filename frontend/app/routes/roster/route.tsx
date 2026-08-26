import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';

import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import { Spinner } from '~/components/ui/spinner';
import { useVenueContextStore } from '~/lib/venue-context';

import { DayCostStrip } from './components/DayCostStrip';
import { RosterGrid } from './components/RosterGrid';
import { RosterHeader } from './components/RosterHeader';
import { RosterLegend } from './components/RosterLegend';
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
  dateForDay,
  groupShiftsByStaffDay,
  mustFindVenue,
  resolveStaffRate,
  shiftKey,
  totalAwardCost,
} from './types';
import { usePageTitle } from '~/lib/utils';

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
      <RosterHeader
        venues={venues}
        activeVenueId={activeVenueId}
        venue={venue}
        onVenueChange={setActiveVenueId}
        weekStart={weekStart}
        weekStartIso={weekStartIso}
        onGoToWeek={goToWeek}
        currentShiftCount={shifts.length}
        budgetSummary={budgetSummaryQuery.data}
        onSaveTarget={value => saveForecastTargetMutation.mutate(value)}
        savingTarget={saveForecastTargetMutation.isPending}
      />

      <DayCostStrip
        weekStart={weekStart}
        perDayTotals={perDayTotals}
        isViewingCurrentWeek={isViewingCurrentWeek}
        todayIndex={TODAY_INDEX}
      />

      <RosterGrid
        venue={venue}
        staff={staff}
        roleFor={roleFor}
        shiftsByKey={shiftsByKey}
        isViewingCurrentWeek={isViewingCurrentWeek}
        todayIndex={TODAY_INDEX}
        onOpenAdd={openAdd}
        onOpenEdit={openEdit}
      />

      <RosterLegend roles={roles} />

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
