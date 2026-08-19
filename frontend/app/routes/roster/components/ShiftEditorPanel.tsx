import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { DateTime } from "luxon";
import { AlertTriangleIcon, ClockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

import { evaluateComplianceViolations } from "../compliance";
import {
  ROLE_META,
  VIOLATION_TYPE_META,
  currency2,
  dateForDay,
  formatHoursDuration,
  getRateInfo,
  mapComplianceViolation,
} from "../types";
import type { DayOfWeek, Shift, ShiftDraft, ShiftDto, StaffMember } from "../types";
import { DAY_LABELS } from "../types";

export interface ShiftEditorPanelState {
  staffId: string;
  dayOfWeek: DayOfWeek;
  shift: Shift | null; // null = adding a new shift
  draftId: string; // client-generated id, stable across the preview → save transition
}

interface ShiftEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panel: ShiftEditorPanelState | null;
  staff: StaffMember | null;
  weekStart: DateTime;
  staffShifts: Shift[]; // this staff member's other shifts this week (query data)
  draft: ShiftDraft;
  onDraftChange: (draft: ShiftDraft) => void;
  onSave: (overrideReasons: Record<string, string>) => void;
  onDelete: () => void;
  saving: boolean;
}

export function ShiftEditorPanel({
  open,
  onOpenChange,
  panel,
  staff,
  weekStart,
  staffShifts,
  draft,
  onDraftChange,
  onSave,
  onDelete,
  saving,
}: ShiftEditorPanelProps) {
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  // Tracks which shift overrideReasons was collected for, so it can be
  // reset when the panel switches to a different shift. Adjusted during
  // render (React's recommended pattern for state derived from a prop
  // change) rather than in an effect, which would cause an extra render.
  const [reasonsForDraftId, setReasonsForDraftId] = useState<string | null>(null);
  if (panel && panel.draftId !== reasonsForDraftId) {
    setReasonsForDraftId(panel.draftId);
    setOverrideReasons({});
  }

  const rateInfo = panel
    ? getRateInfo(weekStart, panel.dayOfWeek, draft.start, draft.end, draft.breakMins, staff?.rate ?? 0)
    : null;
  const roleMeta = staff ? ROLE_META[staff.role] : null;

  // Live preview of what IRosterComplianceValidator would return if this
  // draft were saved right now — evaluated against the staff member's other
  // shifts this week, per CLAUDE.md's "takes shift context, not just the
  // single shift" rule. Pure client-side computation so it updates on every
  // keystroke, not just after a save round trip.
  const previewViolations = useMemo(() => {
    if (!panel) return [];
    const others = staffShifts.filter((s) => s.id !== panel.draftId);
    const draftDto: ShiftDto = {
      id: panel.draftId,
      staffId: panel.staffId,
      dayOfWeek: panel.dayOfWeek,
      start: draft.start,
      end: draft.end,
      breakMins: draft.breakMins,
    };
    return evaluateComplianceViolations(weekStart, [...others, draftDto], [{ id: panel.staffId }])
      .filter((v) => v.shiftId === panel.draftId)
      .map(mapComplianceViolation);
  }, [panel, staffShifts, draft, weekStart]);

  const blockingViolations = previewViolations.filter((v) => v.severity === "blocking");
  const warningViolations = previewViolations.filter((v) => v.severity === "warning");
  const canSave = blockingViolations.every((v) => (overrideReasons[v.id] ?? "").trim().length > 0);

  function handleStartChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, start: e.target.value });
  }
  function handleEndChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, end: e.target.value });
  }
  function handleBreakChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, breakMins: Number(e.target.value) || 0 });
  }
  function handleReasonChange(violationId: string, reason: string) {
    setOverrideReasons((prev) => ({ ...prev, [violationId]: reason }));
  }
  function handleSaveClick() {
    const reasons: Record<string, string> = {};
    for (const v of blockingViolations) {
      const reason = (overrideReasons[v.id] ?? "").trim();
      if (reason) reasons[v.id] = reason;
    }
    onSave(reasons);
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
                {DAY_LABELS[panel.dayOfWeek]}{" "}
                {dateForDay(weekStart, panel.dayOfWeek).toFormat("d LLL")} · {staff.title}
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
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={draft.breakMins}
                  onChange={handleBreakChange}
                  className="h-9 w-28 rounded-lg font-sans font-medium tabular-nums"
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

              {/* Inline compliance warnings — itemised per CLAUDE.md's
                  IRosterComplianceValidator contract, never flattened to a
                  boolean. Warning-severity is informational; Blocking
                  requires an override reason before Save is enabled. */}
              {warningViolations.length > 0 && (
                <div className="flex flex-col gap-2">
                  {warningViolations.map((v) => (
                    <Alert key={v.id}>
                      <AlertTriangleIcon />
                      <AlertTitle>{VIOLATION_TYPE_META[v.type].label}</AlertTitle>
                      <AlertDescription>{v.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {blockingViolations.length > 0 && (
                <div className="flex flex-col gap-3">
                  {blockingViolations.map((v) => (
                    <Field key={v.id} data-invalid={!overrideReasons[v.id]?.trim()}>
                      <Alert variant="destructive">
                        <AlertTriangleIcon />
                        <AlertTitle className="flex items-center gap-2">
                          {VIOLATION_TYPE_META[v.type].label}
                          <Badge variant="destructive">Blocking</Badge>
                        </AlertTitle>
                        <AlertDescription>{v.message}</AlertDescription>
                      </Alert>
                      <FieldLabel htmlFor={`override-${v.id}`}>
                        Manager override reason (required to save)
                      </FieldLabel>
                      <Textarea
                        id={`override-${v.id}`}
                        value={overrideReasons[v.id] ?? ""}
                        onChange={(e) => handleReasonChange(v.id, e.target.value)}
                        placeholder="Why is this shift going ahead despite the violation?"
                        aria-invalid={!overrideReasons[v.id]?.trim()}
                      />
                      <FieldDescription>
                        This reason is recorded against the violation for audit purposes.
                      </FieldDescription>
                    </Field>
                  ))}
                </div>
              )}
            </div>

            <SheetFooter
              className="border-t px-6 py-5 flex-row gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              {panel.shift && (
                <Button variant="destructive" size="lg" onClick={onDelete} disabled={saving}>
                  Delete
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                className="flex-1 font-semibold"
                onClick={handleSaveClick}
                disabled={!canSave || saving}
              >
                {saving && <Spinner data-icon="inline-start" />}
                {panel.shift ? "Save changes" : "Add shift"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
