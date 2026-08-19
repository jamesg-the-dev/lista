import { Fragment, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { DateTime, Duration, Interval } from "luxon";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";

interface Venue {
  id: string;
  name: string;
  suburb: string;
}

type Role = "kitchen" | "floor" | "bar" | "manager";

interface RoleMeta {
  label: string;
  color: string;
  tint: string;
  letter: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: Role;
  title: string;
  rate: number;
}

interface Shift {
  id: string;
  start: string;
  end: string;
  breakMins: number;
}

type ShiftsByKey = Record<string, Shift[] | undefined>;

interface RateInfo {
  grossHrs: number;
  paidHrs: number;
  multiplier: number;
  label: string;
  cost: number;
}

interface PanelState {
  staffId: string;
  dayIdx: number;
  shift: Shift | null;
}

interface ShiftDraft {
  start: string;
  end: string;
  breakMins: number;
}

const VENUES: Venue[] = [
  { id: "v1", name: "Little Collins Café", suburb: "Melbourne CBD" },
  { id: "v2", name: "Fitzroy Yard", suburb: "Fitzroy" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEK_START = DateTime.local(2026, 8, 17); // Mon 17 Aug 2026
const TODAY_INDEX = 1; // Tue 18 Aug 2026

function dateForDay(idx: number): DateTime {
  return WEEK_START.plus({ days: idx });
}

function formatDateShort(d: DateTime): string {
  return d.toFormat("d LLL");
}

function formatHoursDuration(hours: number): string {
  const dur = Duration.fromObject({ hours }).shiftTo("hours", "minutes");
  const h = Math.trunc(dur.hours);
  const m = Math.round(dur.minutes);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Role colors are our only custom-hue tokens — functional (role identity),
// not decorative. See docs/design-system.md § Role colors.
const ROLE_META: Record<Role, RoleMeta> = {
  kitchen: { label: "Kitchen", color: "#B85C2E", tint: "#3A2519", letter: "K" },
  floor: { label: "Floor", color: "#4C9A8E", tint: "#173029", letter: "F" },
  bar: { label: "Bar", color: "#C9A227", tint: "#332B0E", letter: "B" },
  manager: { label: "Manager", color: "#7D8CC4", tint: "#232A42", letter: "M" },
};

const STAFF: StaffMember[] = [
  {
    id: "s1",
    name: "Priya Nair",
    role: "kitchen",
    title: "Cook Gr3",
    rate: 27.1,
  },
  {
    id: "s2",
    name: "Jordan Blake",
    role: "kitchen",
    title: "Kitchen Hand",
    rate: 24.8,
  },
  {
    id: "s3",
    name: "Maya Chen",
    role: "floor",
    title: "F&B Attendant Gr3",
    rate: 26.2,
  },
  {
    id: "s4",
    name: "Liam O'Connor",
    role: "floor",
    title: "F&B Attendant Gr2",
    rate: 25.1,
  },
  {
    id: "s5",
    name: "Sofia Russo",
    role: "bar",
    title: "Bartender Gr3",
    rate: 27.9,
  },
  {
    id: "s6",
    name: "Tom Whitfield",
    role: "manager",
    title: "Supervisor",
    rate: 32.4,
  },
];

const initialShifts: ShiftsByKey = {
  "s1-0": [{ id: "sh1", start: "07:00", end: "15:00", breakMins: 30 }],
  "s1-1": [{ id: "sh2", start: "07:00", end: "15:00", breakMins: 30 }],
  "s1-4": [{ id: "sh3", start: "12:00", end: "20:00", breakMins: 30 }],
  "s1-5": [{ id: "sh4", start: "10:00", end: "18:00", breakMins: 30 }],
  "s2-0": [{ id: "sh5", start: "07:00", end: "13:00", breakMins: 0 }],
  "s2-2": [{ id: "sh6", start: "07:00", end: "13:00", breakMins: 0 }],
  "s2-6": [{ id: "sh7", start: "09:00", end: "15:00", breakMins: 30 }],
  "s3-1": [{ id: "sh8", start: "11:00", end: "19:00", breakMins: 30 }],
  "s3-4": [{ id: "sh9", start: "11:00", end: "21:00", breakMins: 30 }],
  "s3-5": [{ id: "sh10", start: "09:00", end: "17:00", breakMins: 30 }],
  "s4-0": [{ id: "sh11", start: "11:00", end: "19:00", breakMins: 30 }],
  "s4-3": [{ id: "sh12", start: "11:00", end: "19:00", breakMins: 30 }],
  "s4-6": [{ id: "sh13", start: "10:00", end: "16:00", breakMins: 0 }],
  "s5-4": [{ id: "sh14", start: "16:00", end: "23:00", breakMins: 30 }],
  "s5-5": [{ id: "sh15", start: "16:00", end: "23:30", breakMins: 30 }],
  "s5-6": [{ id: "sh16", start: "15:00", end: "22:00", breakMins: 30 }],
  "s6-1": [{ id: "sh17", start: "08:00", end: "16:00", breakMins: 30 }],
  "s6-5": [{ id: "sh18", start: "10:00", end: "18:00", breakMins: 30 }],
};

const WEEKLY_BUDGET = 9200;

function getRateInfo(
  dayIdx: number,
  start: string,
  end: string,
  breakMins: number,
  baseRate: number,
): RateInfo {
  const date = dateForDay(dayIdx);
  const startDT = DateTime.fromISO(`${date.toISODate()}T${start}`);
  let endDT = DateTime.fromISO(`${date.toISODate()}T${end}`);
  // Overnight shifts (end time past midnight) roll onto the next calendar
  // day so the interval below is correct by construction — no manual
  // hour-wraparound arithmetic.
  if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

  const grossHrs = Interval.fromDateTimes(startDT, endDT).length("hours");
  const breakHrs = Duration.fromObject({ minutes: breakMins }).as("hours");
  const paidHrs = Math.max(0, grossHrs - breakHrs);

  let multiplier = 1;
  let label = "Ordinary hours";
  if (dayIdx === 5) {
    multiplier = 1.25;
    label = "Saturday penalty +25%";
  } else if (dayIdx === 6) {
    multiplier = 1.5;
    label = "Sunday penalty +50%";
  } else if (endDT.hour + endDT.minute / 60 > 19) {
    multiplier = 1.1;
    label = "Weekday evening loading +10%";
  }

  const cost = paidHrs * baseRate * multiplier;
  return { grossHrs, paidHrs, multiplier, label, cost };
}

function currency(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}
function currency2(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

function mustFindVenue(venueId: string): Venue {
  const venue = VENUES.find((v) => v.id === venueId);
  if (!venue) throw new Error(`Unknown venue id: ${venueId}`);
  return venue;
}

function mustFindStaff(staffId: string): StaffMember {
  const staff = STAFF.find((s) => s.id === staffId);
  if (!staff) throw new Error(`Unknown staff id: ${staffId}`);
  return staff;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

interface ShiftEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panel: PanelState | null;
  staff: StaffMember | null;
  draft: ShiftDraft;
  onDraftChange: (draft: ShiftDraft) => void;
  onSave: () => void;
  onDelete: () => void;
}

function ShiftEditorPanel({
  open,
  onOpenChange,
  panel,
  staff,
  draft,
  onDraftChange,
  onSave,
  onDelete,
}: ShiftEditorPanelProps) {
  const rateInfo = panel
    ? getRateInfo(
        panel.dayIdx,
        draft.start,
        draft.end,
        draft.breakMins,
        staff?.rate ?? 0,
      )
    : null;
  const roleMeta = staff ? ROLE_META[staff.role] : null;

  function handleStartChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, start: e.target.value });
  }
  function handleEndChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, end: e.target.value });
  }
  function handleBreakChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, breakMins: Number(e.target.value) || 0 });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {panel && staff && roleMeta && rateInfo && (
          <>
            <SheetHeader
              className="border-b px-6 py-5 gap-0"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="font-sans font-semibold text-xs uppercase tracking-widest"
                style={{ color: "var(--muted-foreground)" }}
              >
                {panel.shift ? "Edit shift" : "Add shift"}
              </p>
              <SheetTitle className="text-base font-medium mt-0.5">
                {staff.name}
              </SheetTitle>
              <SheetDescription style={{ color: roleMeta.color }}>
                {DAY_LABELS[panel.dayIdx]}{" "}
                {formatDateShort(dateForDay(panel.dayIdx))} · {staff.title}
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-5 flex flex-col gap-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Start
                  </span>
                  <InputGroup className="h-9 rounded-lg">
                    <InputGroupInput
                      type="time"
                      value={draft.start}
                      onChange={handleStartChange}
                      step="60"
                      className="appearance-none font-sans font-medium tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <InputGroupAddon>
                      <ClockIcon size={14} />
                    </InputGroupAddon>
                  </InputGroup>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    End
                  </span>
                  <InputGroup className="h-9 rounded-lg">
                    <InputGroupInput
                      type="time"
                      value={draft.end}
                      onChange={handleEndChange}
                      step="60"
                      className="appearance-none font-sans font-medium tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <InputGroupAddon>
                      <ClockIcon size={14} />
                    </InputGroupAddon>
                  </InputGroup>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Unpaid break (minutes)
                </span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={draft.breakMins}
                  onChange={handleBreakChange}
                  className="rounded-lg border px-3 py-2 text-sm font-sans font-medium tabular-nums outline-none w-28"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--input)",
                    color: "var(--foreground)",
                  }}
                />
              </label>

              {/* Transparent award breakdown — receipt style */}
              <div
                className="rounded-lg border p-4 font-sans font-medium text-sm tabular-nums"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                }}
              >
                <p
                  className="font-sans font-semibold text-[11px] uppercase tracking-widest mb-3"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Award rate breakdown
                </p>
                <div className="flex justify-between mb-1.5">
                  <span style={{ color: "var(--muted-foreground)" }}>
                    Base rate
                  </span>
                  <span>{currency2(staff.rate)}/hr</span>
                </div>
                <div className="flex justify-between mb-1.5">
                  <span style={{ color: "var(--muted-foreground)" }}>
                    Paid hours
                  </span>
                  <span>{formatHoursDuration(rateInfo.paidHrs)}</span>
                </div>
                <div
                  className="flex justify-between mb-3 pb-3 border-b border-dashed"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ color: "var(--foreground)" }}>
                    {rateInfo.label}
                  </span>
                  <span style={{ color: "var(--foreground)" }}>
                    ×{rateInfo.multiplier.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Shift total</span>
                  <span>{currency2(rateInfo.cost)}</span>
                </div>
              </div>
            </div>

            <SheetFooter
              className="border-t px-6 py-5 flex-row gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              {panel.shift && (
                <Button variant="destructive" size="lg" onClick={onDelete}>
                  Delete
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                className="flex-1 font-semibold"
                onClick={onSave}
              >
                {panel.shift ? "Save changes" : "Add shift"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function RosterBuilder() {
  const [venueId, setVenueId] = useState<string>("v1");
  const [shifts, setShifts] = useState<ShiftsByKey>(initialShifts);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [draft, setDraft] = useState<ShiftDraft>({
    start: "09:00",
    end: "17:00",
    breakMins: 30,
  });

  const venue = mustFindVenue(venueId);

  const perDayTotals = useMemo(() => {
    const totals = new Array(7).fill(0);
    STAFF.forEach((st) => {
      for (let d = 0; d < 7; d++) {
        const list = shifts[`${st.id}-${d}`] ?? [];
        list.forEach((sh) => {
          const info = getRateInfo(d, sh.start, sh.end, sh.breakMins, st.rate);
          totals[d] += info.cost;
        });
      }
    });
    return totals;
  }, [shifts]);

  const weeklyTotal = perDayTotals.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...perDayTotals, 1);
  const delta = WEEKLY_BUDGET - weeklyTotal;
  const overBudget = delta < 0;

  function openAdd(staffId: string, dayIdx: number) {
    setDraft({ start: "09:00", end: "17:00", breakMins: 30 });
    setPanel({ staffId, dayIdx, shift: null });
    setPanelOpen(true);
  }
  function openEdit(staffId: string, dayIdx: number, shift: Shift) {
    setDraft({
      start: shift.start,
      end: shift.end,
      breakMins: shift.breakMins,
    });
    setPanel({ staffId, dayIdx, shift });
    setPanelOpen(true);
  }
  function closePanel() {
    setPanelOpen(false);
  }
  function saveShift() {
    if (!panel) return;
    const key = `${panel.staffId}-${panel.dayIdx}`;
    setShifts((prev) => {
      const list = prev[key] ? [...prev[key]] : [];
      if (panel.shift) {
        const shiftId = panel.shift.id;
        const i = list.findIndex((s) => s.id === shiftId);
        list[i] = { ...list[i], ...draft, id: shiftId };
      } else {
        list.push({ id: crypto.randomUUID(), ...draft });
      }
      return { ...prev, [key]: list };
    });
    closePanel();
  }
  function deleteShift() {
    if (!panel || !panel.shift) return;
    const key = `${panel.staffId}-${panel.dayIdx}`;
    const shiftId = panel.shift.id;
    setShifts((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((s) => s.id !== shiftId),
    }));
    closePanel();
  }

  const panelStaff = panel ? mustFindStaff(panel.staffId) : null;

  const themeStyle: CSSProperties = {
    background: "var(--background)",
    color: "var(--foreground)",
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans"
      style={themeStyle}
    >
      <style>{`
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .live-dot { animation: pulseDot 2s ease-in-out infinite; }
      `}</style>

      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 border-b"
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
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "var(--foreground)" }}
              />
              <div className="text-left">
                <p className="font-sans font-semibold text-sm uppercase leading-tight">
                  {venue.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {venue.suburb}
                </p>
              </div>
              <ChevronDownIcon
                size={14}
                className="ml-1 flex-shrink-0"
                style={{ color: "var(--muted-foreground)" }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64"
              style={{
                background: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              {VENUES.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => setVenueId(v.id)}
                  className="justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {v.suburb}
                    </p>
                  </div>
                  {v.id === venueId && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--foreground)" }}
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="hidden md:flex items-center gap-2 pl-4 border-l"
            style={{ borderColor: "var(--border)" }}
          >
            <Button
              variant="ghost"
              size="icon"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ChevronLeftIcon size={18} />
            </Button>
            <span className="font-sans font-medium text-sm tabular-nums">
              {formatDateShort(dateForDay(0))} –{" "}
              {formatDateShort(dateForDay(6))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ChevronRightIcon size={18} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <p
              className="text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              Award engine
            </p>
            <p className="text-xs font-medium">
              Hospitality Industry General Award
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--border)", background: "var(--muted)" }}
          >
            {/* Live/on-budget vs over-budget is a functional signal — kept as
                dedicated color, not neutral. See docs/design-system.md
                § Color philosophy. */}
            <span
              className="w-1.5 h-1.5 rounded-full live-dot"
              style={{
                background: overBudget
                  ? "var(--destructive)"
                  : "var(--success)",
              }}
            />
            <span className="font-sans font-semibold text-lg tabular-nums">
              {currency(weeklyTotal)}
            </span>
            <span
              className="text-xs font-sans font-medium tabular-nums px-1.5 py-0.5 rounded"
              style={{
                color: overBudget ? "var(--destructive)" : "var(--success)",
                background: overBudget
                  ? "var(--destructive-tint)"
                  : "var(--success-tint)",
              }}
            >
              {overBudget ? "−" : "+"}
              {currency(Math.abs(delta))}
            </span>
          </div>
        </div>
      </header>

      {/* Day cost strip */}
      <div
        className="px-6 py-3 border-b"
        style={{
          borderColor: "var(--border)",
          background: "var(--background)",
        }}
      >
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((d, i) => {
            const isToday = i === TODAY_INDEX;
            const h = Math.max(6, (perDayTotals[i] / maxDay) * 28);
            return (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <div className="flex items-end h-8">
                  <div
                    className="w-8 rounded-t"
                    style={{
                      height: `${h}px`,
                      background: isToday
                        ? "var(--foreground)"
                        : "var(--muted)",
                    }}
                  />
                </div>
                <p
                  className="font-sans font-medium text-[11px] tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {currency(perDayTotals[i])}
                </p>
                <p
                  className="font-sans font-semibold text-xs uppercase"
                  style={{
                    color: isToday
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                  }}
                >
                  {d} {dateForDay(i).day}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-x-auto px-6 py-6">
        <div className="min-w-[1000px]">
          <div
            className="grid"
            style={{ gridTemplateColumns: "220px repeat(7, 1fr)" }}
          >
            <div />
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="text-center pb-3">
                <p
                  className="font-sans font-semibold text-xs uppercase tracking-widest"
                  style={{
                    color:
                      i === TODAY_INDEX
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {d}
                </p>
              </div>
            ))}

            {STAFF.map((st) => {
              const meta = ROLE_META[st.role];
              return (
                <Fragment key={st.id}>
                  <div
                    className="flex items-center gap-3 pr-4 py-3 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-bold text-sm flex-shrink-0"
                      style={{ background: meta.tint, color: meta.color }}
                    >
                      {initials(st.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{st.name}</p>
                      <p
                        className="text-xs truncate"
                        style={{ color: meta.color }}
                      >
                        {st.title}
                      </p>
                    </div>
                  </div>

                  {DAY_LABELS.map((_, dayIdx) => {
                    const key = `${st.id}-${dayIdx}`;
                    const list = shifts[key] ?? [];
                    return (
                      <div
                        key={key}
                        className="border-t px-1.5 py-2 flex flex-col gap-1.5"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {list.map((sh) => {
                          const info = getRateInfo(
                            dayIdx,
                            sh.start,
                            sh.end,
                            sh.breakMins,
                            st.rate,
                          );
                          return (
                            <Button
                              key={sh.id}
                              variant="outline"
                              onClick={() => openEdit(st.id, dayIdx, sh)}
                              className="h-auto w-full items-stretch justify-start gap-0 overflow-hidden rounded-lg p-0 text-left"
                              style={{ background: "var(--card)" }}
                            >
                              <div
                                className="w-6 flex-shrink-0 flex items-center justify-center font-sans font-bold text-xs"
                                style={{
                                  background: meta.color,
                                  color: meta.tint,
                                }}
                              >
                                {meta.letter}
                              </div>
                              <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs font-sans font-medium tabular-nums leading-tight">
                                  {sh.start}–{sh.end}
                                </p>
                                <p
                                  className="text-[10px] font-sans font-medium tabular-nums"
                                  style={{ color: "var(--muted-foreground)" }}
                                >
                                  {currency2(info.cost)}
                                </p>
                              </div>
                            </Button>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openAdd(st.id, dayIdx)}
                          className="h-auto w-full rounded-lg border border-dashed py-2"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--muted-foreground)",
                          }}
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
      </main>

      {/* Legend */}
      <div className="px-6 pb-6 flex flex-wrap gap-4">
        {Object.entries(ROLE_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: meta.color }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {meta.label}
            </span>
          </div>
        ))}
        <span
          className="text-xs ml-auto"
          style={{ color: "var(--muted-foreground)" }}
        >
          Rates shown are illustrative for demo purposes — not authoritative
          payroll advice.
        </span>
      </div>

      {/* Slide-over panel */}
      <ShiftEditorPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        panel={panel}
        staff={panelStaff}
        draft={draft}
        onDraftChange={setDraft}
        onSave={saveShift}
        onDelete={deleteShift}
      />
    </div>
  );
}
