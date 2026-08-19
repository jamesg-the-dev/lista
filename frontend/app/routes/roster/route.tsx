import { Fragment, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { useVenueContextStore } from "~/lib/venue-context";

import { BudgetBar } from "./components/BudgetBar";
import { ComplianceBadge } from "./components/ComplianceBadge";
import { CopyPreviousWeekButton } from "./components/CopyPreviousWeekButton";
import type { ShiftEditorPanelState } from "./components/ShiftEditorPanel";
import { ShiftEditorPanel } from "./components/ShiftEditorPanel";
import {
  useBudgetTarget,
  useComplianceOverrides,
  useComplianceViolations,
  useDeleteShift,
  useRosterStaffMembers,
  useSaveBudgetTarget,
  useSaveComplianceOverride,
  useSaveShift,
  useShifts,
  useVenues,
} from "./hooks";
import type { ComplianceViolation, Shift, ShiftDraft } from "./types";
import {
  DAY_LABELS,
  ROLE_META,
  currency,
  currency2,
  dateForDay,
  getRateInfo,
  groupShiftsByStaffDay,
  initials,
  mustFindVenue,
  shiftKey,
} from "./types";

const WEEK_START = DateTime.local(2026, 8, 17); // Mon 17 Aug 2026
const TODAY_INDEX = 1; // Tue 18 Aug 2026

export default function RosterBuilder() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const [weekStart, setWeekStart] = useState(WEEK_START);
  const weekStartIso = weekStart.toISODate()!;

  const venuesQuery = useVenues();
  const staffQuery = useRosterStaffMembers(activeVenueId);
  const shiftsQuery = useShifts(activeVenueId, weekStartIso);
  const budgetTargetQuery = useBudgetTarget(activeVenueId, weekStartIso);
  const violationsQuery = useComplianceViolations(activeVenueId, weekStartIso);
  const overridesQuery = useComplianceOverrides(activeVenueId, weekStartIso);

  const saveShiftMutation = useSaveShift(activeVenueId, weekStartIso);
  const deleteShiftMutation = useDeleteShift(activeVenueId, weekStartIso);
  const saveOverrideMutation = useSaveComplianceOverride(activeVenueId, weekStartIso);
  const saveBudgetTargetMutation = useSaveBudgetTarget(activeVenueId, weekStartIso);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panel, setPanel] = useState<ShiftEditorPanelState | null>(null);
  const [draft, setDraft] = useState<ShiftDraft>({
    start: "09:00",
    end: "17:00",
    breakMins: 30,
  });

  const venues = venuesQuery.data ?? [];
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const shiftsByKey = useMemo(() => groupShiftsByStaffDay(shifts), [shifts]);

  const violationsByShift = useMemo(() => {
    const map: Record<string, ComplianceViolation[]> = {};
    for (const v of violationsQuery.data ?? []) {
      map[v.shiftId] = [...(map[v.shiftId] ?? []), v];
    }
    return map;
  }, [violationsQuery.data]);
  const overrides = overridesQuery.data ?? [];

  const perDayTotals = useMemo(() => {
    const totals = new Array(7).fill(0);
    staff.forEach((st) => {
      for (let d = 0; d < 7; d++) {
        const list = shiftsByKey[shiftKey(st.id, d)] ?? [];
        list.forEach((sh) => {
          const info = getRateInfo(weekStart, d, sh.start, sh.end, sh.breakMins, st.rate);
          totals[d] += info.cost;
        });
      }
    });
    return totals;
  }, [staff, shiftsByKey, weekStart]);

  const weeklyTotal = perDayTotals.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...perDayTotals, 1);

  function goToWeek(deltaWeeks: number) {
    setWeekStart((prev) => prev.plus({ weeks: deltaWeeks }));
  }

  function openAdd(staffId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
    setDraft({ start: "09:00", end: "17:00", breakMins: 30 });
    setPanel({ staffId, dayOfWeek, shift: null, draftId: crypto.randomUUID() });
    setPanelOpen(true);
  }
  function openEdit(staffId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6, shift: Shift) {
    setDraft({ start: shift.start, end: shift.end, breakMins: shift.breakMins });
    setPanel({ staffId, dayOfWeek, shift, draftId: shift.id });
    setPanelOpen(true);
  }
  function closePanel() {
    setPanelOpen(false);
  }

  async function handleSaveShift(overrideReasons: Record<string, string>) {
    if (!panel) return;
    await saveShiftMutation.mutateAsync({
      id: panel.draftId,
      staffId: panel.staffId,
      dayOfWeek: panel.dayOfWeek,
      ...draft,
    });
    await Promise.all(
      Object.entries(overrideReasons).map(([violationId, reason]) =>
        saveOverrideMutation.mutateAsync({ violationId, reason }),
      ),
    );
    closePanel();
  }

  async function handleDeleteShift() {
    if (!panel?.shift) return;
    await deleteShiftMutation.mutateAsync(panel.shift.id);
    closePanel();
  }

  const panelStaff = panel ? (staff.find((s) => s.id === panel.staffId) ?? null) : null;
  const panelStaffShifts = panel
    ? shifts.filter((s) => s.staffId === panel.staffId)
    : [];

  if (venuesQuery.isLoading || staffQuery.isLoading || shiftsQuery.isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Spinner className="size-6" />
      </div>
    );
  }

  if (venuesQuery.isError || staffQuery.isError || shiftsQuery.isError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
        <Empty>
          <EmptyTitle>Couldn't load the roster</EmptyTitle>
          <EmptyDescription>
            {(venuesQuery.error ?? staffQuery.error ?? shiftsQuery.error)?.message ??
              "Something went wrong. Try again shortly."}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const venue = mustFindVenue(venues, activeVenueId);

  return (
    <div className="min-h-screen w-full flex flex-col font-sans" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .live-dot { animation: pulseDot 2s ease-in-out infinite; }
      `}</style>

      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto gap-2 rounded-lg px-3 py-2"
                  style={{ background: "var(--muted)" }}
                />
              }
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--foreground)" }} />
              <div className="text-left">
                <p className="font-sans font-semibold text-sm uppercase leading-tight">{venue.name}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{venue.suburb}</p>
              </div>
              <ChevronDownIcon size={14} className="ml-1 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
              {venues.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => setActiveVenueId(v.id)}
                  className="justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{v.suburb}</p>
                  </div>
                  {v.id === activeVenueId && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--foreground)" }} />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
            <Button variant="ghost" size="icon" style={{ color: "var(--muted-foreground)" }} onClick={() => goToWeek(-1)}>
              <ChevronLeftIcon size={18} />
            </Button>
            <span className="font-sans font-medium text-sm tabular-nums">
              {dateForDay(weekStart, 0).toFormat("d LLL")} – {dateForDay(weekStart, 6).toFormat("d LLL")}
            </span>
            <Button variant="ghost" size="icon" style={{ color: "var(--muted-foreground)" }} onClick={() => goToWeek(1)}>
              <ChevronRightIcon size={18} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Award engine</p>
            <p className="text-xs font-medium">Hospitality Industry General Award</p>
          </div>
          <CopyPreviousWeekButton
            venueId={activeVenueId}
            weekStartIso={weekStartIso}
            previousWeekLabel={dateForDay(weekStart.minus({ weeks: 1 }), 0).toFormat("d LLL")}
            currentShiftCount={shifts.length}
          />
          <BudgetBar
            weeklyTotal={weeklyTotal}
            target={budgetTargetQuery.data?.weeklyTarget ?? null}
            onSaveTarget={(value) => saveBudgetTargetMutation.mutate(value)}
            savingTarget={saveBudgetTargetMutation.isPending}
          />
        </div>
      </header>

      {/* Day cost strip */}
      <div className="px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((d, i) => {
            const isToday = i === TODAY_INDEX;
            const h = Math.max(6, (perDayTotals[i] / maxDay) * 28);
            return (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <div className="flex items-end h-8">
                  <div
                    className="w-8 rounded-t"
                    style={{ height: `${h}px`, background: isToday ? "var(--foreground)" : "var(--muted)" }}
                  />
                </div>
                <p className="font-sans font-medium text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                  {currency(perDayTotals[i])}
                </p>
                <p
                  className="font-sans font-semibold text-xs uppercase"
                  style={{ color: isToday ? "var(--foreground)" : "var(--muted-foreground)" }}
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
            <EmptyDescription>Assign staff to {venue.name} from the Staff screen first.</EmptyDescription>
          </Empty>
        ) : (
          <div className="min-w-[1000px]">
            <div className="grid" style={{ gridTemplateColumns: "220px repeat(7, 1fr)" }}>
              <div />
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="text-center pb-3">
                  <p
                    className="font-sans font-semibold text-xs uppercase tracking-widest"
                    style={{ color: i === TODAY_INDEX ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {d}
                  </p>
                </div>
              ))}

              {staff.map((st) => {
                const meta = ROLE_META[st.role];
                return (
                  <Fragment key={st.id}>
                    <div className="flex items-center gap-3 pr-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-bold text-sm shrink-0"
                        style={{ background: meta.tint, color: meta.color }}
                      >
                        {initials(st.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{st.name}</p>
                        <p className="text-xs truncate" style={{ color: meta.color }}>{st.title}</p>
                      </div>
                    </div>

                    {DAY_LABELS.map((_, dayIdx) => {
                      const dayOfWeek = dayIdx as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                      const key = shiftKey(st.id, dayIdx);
                      const list = shiftsByKey[key] ?? [];
                      return (
                        <div
                          key={key}
                          className="border-t px-1.5 py-2 flex flex-col gap-1.5"
                          style={{ borderColor: "var(--border)" }}
                        >
                          {list.map((sh) => {
                            const info = getRateInfo(weekStart, dayIdx, sh.start, sh.end, sh.breakMins, st.rate);
                            const shiftViolations = violationsByShift[sh.id] ?? [];
                            return (
                              <div key={sh.id} className="relative">
                                <Button
                                  variant="outline"
                                  onClick={() => openEdit(st.id, dayOfWeek, sh)}
                                  className="h-auto w-full items-stretch justify-start gap-0 overflow-hidden rounded-lg p-0 text-left"
                                  style={{ background: "var(--card)" }}
                                >
                                  <div
                                    className="w-6 shrink-0 flex items-center justify-center font-sans font-bold text-xs"
                                    style={{ background: meta.color, color: meta.tint }}
                                  >
                                    {meta.letter}
                                  </div>
                                  <div className="px-2 py-1.5 min-w-0">
                                    <p className="text-xs font-sans font-medium tabular-nums leading-tight">
                                      {sh.start}–{sh.end}
                                    </p>
                                    <p className="text-[10px] font-sans font-medium tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                                      {currency2(info.cost)}
                                    </p>
                                  </div>
                                </Button>
                                {shiftViolations.length > 0 && (
                                  <div className="absolute -top-1.5 -right-1.5 z-10">
                                    <ComplianceBadge violations={shiftViolations} overrides={overrides} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openAdd(st.id, dayOfWeek)}
                            className="h-auto w-full rounded-lg border border-dashed py-2"
                            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
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
      <div className="px-6 pb-6 flex flex-wrap gap-4">
        {Object.entries(ROLE_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{meta.label}</span>
          </div>
        ))}
        <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
          Rates and compliance rules shown are illustrative for demo purposes — not authoritative payroll or legal advice.
        </span>
      </div>

      {/* Slide-over panel */}
      <ShiftEditorPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        panel={panel}
        staff={panelStaff}
        weekStart={weekStart}
        staffShifts={panelStaffShifts}
        draft={draft}
        onDraftChange={setDraft}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        saving={saveShiftMutation.isPending || deleteShiftMutation.isPending}
      />
    </div>
  );
}
