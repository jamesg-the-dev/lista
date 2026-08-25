import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import type { DateTime } from 'luxon';
import { AlertTriangleIcon, ClockIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Spinner } from '~/components/ui/spinner';
import { Textarea } from '~/components/ui/textarea';

import {
  VIOLATION_TYPE_META,
  currency2,
  dateForDay,
  formatHoursDuration,
  getRateInfo,
  resolveStaffRate,
  roleColor,
} from '../types';
import type {
  ComplianceViolationType,
  DayOfWeek,
  Role,
  Shift,
  ShiftDraft,
  StaffMember,
} from '../types';
import { DAY_LABELS } from '../types';
import { Link } from 'react-router';

export interface ShiftEditorPanelState {
  staffId: string;
  dayOfWeek: DayOfWeek;
  shift: Shift | null; // null = adding a new shift
  draftId: string; // stable React key for the panel while it's open
}

interface ShiftEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panel: ShiftEditorPanelState | null;
  staff: StaffMember | null;
  role: Role | null;
  weekStart: DateTime;
  draft: ShiftDraft;
  onDraftChange: (draft: ShiftDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  onOverrideViolation: (violationType: ComplianceViolationType, reason: string) => void;
  overridingViolationType: ComplianceViolationType | null;
}

export function ShiftEditorPanel({
  open,
  onOpenChange,
  panel,
  staff,
  role,
  weekStart,
  draft,
  onDraftChange,
  onSave,
  onDelete,
  saving,
  onOverrideViolation,
  overridingViolationType,
}: ShiftEditorPanelProps) {
  // Local override-reason drafts, keyed by violation type — reset whenever
  // a different shift's panel opens so a stale draft from one shift can't
  // leak into another.
  const [overrideReasons, setOverrideReasons] = useState<
    Partial<Record<ComplianceViolationType, string>>
  >({});
  useEffect(() => {
    setOverrideReasons({});
  }, [panel?.draftId]);

  const staffRate = resolveStaffRate(staff, role);
  const { rate: resolvedRate, source: rateSource } = staffRate;
  const rateInfo = panel
    ? getRateInfo(
        weekStart,
        panel.dayOfWeek,
        draft.start,
        draft.end,
        draft.unpaidBreakMinutes,
        staffRate.rate,
      )
    : null;

  // Compliance violations are server-computed and only exist once a shift
  // has been saved at least once (IRosterComplianceValidator runs inside
  // CreateShift/UpdateShift's handlers — there's no dry-run/preview
  // endpoint) — so a brand-new, not-yet-saved shift shows none yet.
  const violations = panel?.shift?.complianceViolations ?? [];
  const blockingViolations = violations.filter(v => v.severity === 'blocking');
  const warningViolations = violations.filter(v => v.severity === 'warning');

  const canSave =
    draft.start.length > 0 &&
    draft.end.length > 0 &&
    draft.end > draft.start &&
    staffRate.rate !== null;

  function handleStartChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, start: e.target.value });
  }
  function handleEndChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, end: e.target.value });
  }
  function handleBreakChange(e: ChangeEvent<HTMLInputElement>) {
    onDraftChange({ ...draft, unpaidBreakMinutes: Number(e.target.value) || 0 });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-border bg-card flex flex-col p-0">
        {panel && staff && rateInfo && (
          <>
            <SheetHeader className="border-border gap-0 border-b px-6 py-5">
              <p className="text-muted-foreground font-sans text-xs font-semibold tracking-widest uppercase">
                {panel.shift ? 'Edit shift' : 'Add shift'}
              </p>
              <SheetTitle className="mt-0.5 text-base font-medium">
                {staff.name}
              </SheetTitle>
              <SheetDescription style={{ color: roleColor(role) }}>
                {DAY_LABELS[panel.dayOfWeek]}{' '}
                {dateForDay(weekStart, panel.dayOfWeek).toFormat('d LLL')} ·{' '}
                {role?.displayName ?? 'No role assigned'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs">Start</span>
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
                  <span className="text-muted-foreground text-xs">End</span>
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
              {!canSave && (
                <p className="text-destructive -mt-3 text-xs">
                  Shift end must be after start.
                </p>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs">
                  Unpaid break (minutes)
                </span>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={draft.unpaidBreakMinutes}
                  onChange={handleBreakChange}
                  className="h-9 w-28 rounded-lg font-sans font-medium tabular-nums"
                />
              </label>

              {resolvedRate === null ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>No award rate</AlertTitle>
                  <AlertDescription>
                    {role
                      ? `"${role.displayName}" isn't mapped to an award classification yet.`
                      : `${staff.name} has no role assigned.`}{' '}
                    Set it in &nbsp;
                    <Link
                      to="/settings/staff-roles"
                      className="inline-block hover:underline"
                    >
                      Settings → Staff &amp; Roles &nbsp;
                    </Link>
                    before this shift can be saved — pay may be incorrect until then.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border-border bg-background rounded-lg border p-4 font-sans text-sm font-medium tabular-nums">
                  <p className="text-muted-foreground mb-3 font-sans text-[11px] font-semibold tracking-widest uppercase">
                    Award rate breakdown
                  </p>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-muted-foreground">
                      {rateSource === 'override' ? 'Override rate' : 'Award rate'}
                    </span>
                    <span>{currency2(resolvedRate)}/hr</span>
                  </div>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-muted-foreground">Paid hours</span>
                    <span>{formatHoursDuration(rateInfo.paidHrs)}</span>
                  </div>
                  <div className="border-border mb-3 flex justify-between border-b border-dashed pb-3">
                    <span className="text-foreground">{rateInfo.label}</span>
                    <span className="text-foreground">
                      {rateInfo.flatDollarPerHour > 0
                        ? `+${currency2(rateInfo.flatDollarPerHour)}/hr`
                        : `×${rateInfo.multiplier.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Shift total</span>
                    <span>{currency2(rateInfo.cost ?? 0)}</span>
                  </div>
                </div>
              )}

              {warningViolations.length > 0 && (
                <div className="flex flex-col gap-2">
                  {warningViolations.map(v => (
                    <Alert key={v.type}>
                      <AlertTriangleIcon />
                      <AlertTitle>{VIOLATION_TYPE_META[v.type].label}</AlertTitle>
                      <AlertDescription>{v.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {blockingViolations.length > 0 && (
                <div className="flex flex-col gap-3">
                  {blockingViolations.map(v => {
                    const reasonValue = overrideReasons[v.type] ?? v.overrideReason ?? '';
                    const isOverriding = overridingViolationType === v.type;
                    return (
                      <Field key={v.type}>
                        <Alert variant="destructive">
                          <AlertTriangleIcon />
                          <AlertTitle className="flex items-center gap-2">
                            {VIOLATION_TYPE_META[v.type].label}
                            <Badge variant="destructive">Blocking</Badge>
                          </AlertTitle>
                          <AlertDescription>{v.message}</AlertDescription>
                        </Alert>
                        <FieldLabel htmlFor={`override-${v.type}`}>
                          Manager override reason
                        </FieldLabel>
                        <Textarea
                          id={`override-${v.type}`}
                          value={reasonValue}
                          disabled={v.acknowledged}
                          onChange={e =>
                            setOverrideReasons(prev => ({
                              ...prev,
                              [v.type]: e.target.value,
                            }))
                          }
                          placeholder="Explain why this shift should still be published."
                        />
                        <FieldDescription>
                          {v.acknowledged
                            ? 'Overridden — reason recorded for audit purposes.'
                            : 'An override reason is required and is recorded to the audit log.'}
                        </FieldDescription>
                        {!v.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOverrideViolation(v.type, reasonValue)}
                            disabled={reasonValue.trim().length === 0 || isOverriding}
                          >
                            {isOverriding && <Spinner data-icon="inline-start" />}
                            Override
                          </Button>
                        )}
                      </Field>
                    );
                  })}
                </div>
              )}
            </div>

            <SheetFooter className="border-border flex-row gap-3 border-t px-6 py-5">
              {panel.shift && (
                <Button variant="destructive" onClick={onDelete} disabled={saving}>
                  Delete
                </Button>
              )}
              <Button
                variant="default"
                className="flex-1 font-semibold"
                onClick={onSave}
                disabled={!canSave || saving}
              >
                {saving && <Spinner data-icon="inline-start" />}
                {panel.shift ? 'Save changes' : 'Add shift'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
