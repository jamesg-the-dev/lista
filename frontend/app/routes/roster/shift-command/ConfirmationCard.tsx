// The safety net for the AI shift command palette — nothing is written
// until the manager confirms here (see spec's UX Flow step 5-6). Renders
// one editable row per ParsedShiftDraft the parser produced (a multi-staff
// or multi-day input fans out into several), lets the manager fix anything
// the parser got wrong or left unresolved, and only then hands the ready
// drafts back to CommandPalette to actually call CreateShiftCommand.

import { DateTime } from 'luxon';
import { AlertTriangleIcon, Trash2Icon, XIcon } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupInput } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Spinner } from '~/components/ui/spinner';

import { getRateInfo, currency2, dayOfWeekForDate, resolveStaffRate } from '../types';
import type { Role, StaffMember } from '../types';
import type { ParsedShiftDraft, StaffCandidate } from './types';

export interface EditableDraft {
  key: string; // stable React key — draft content alone isn't unique across a fan-out
  draft: ParsedShiftDraft;
}

interface ConfirmationCardProps {
  drafts: EditableDraft[];
  venueStaff: StaffCandidate[];
  staffMembers: StaffMember[];
  roles: Role[];
  onChange: (key: string, patch: Partial<ParsedShiftDraft>) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
}

const UNPAID_BREAK_MINUTES_DEFAULT = 30;

function isDraftReady(draft: ParsedShiftDraft): boolean {
  return (
    draft.staff.resolvedId !== null &&
    draft.date !== null &&
    draft.startTime !== null &&
    draft.endTime !== null &&
    draft.endTime > draft.startTime
  );
}

export function ConfirmationCard({
  drafts,
  venueStaff,
  staffMembers,
  roles,
  onChange,
  onRemove,
  onBack,
  onConfirm,
  confirming,
}: ConfirmationCardProps) {
  const readyCount = drafts.filter(d => isDraftReady(d.draft)).length;

  return (
    <>
      <DialogHeader className="border-border gap-0.5 border-b px-5 py-4">
        <DialogTitle className="text-base font-medium">
          Review before creating {drafts.length > 1 ? `${drafts.length} shifts` : 'shift'}
        </DialogTitle>
        <DialogDescription>
          Nothing is created until you confirm — fix anything the parser got wrong first.
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto p-4">
        {drafts.map(({ key, draft }) => (
          <DraftRow
            key={key}
            draft={draft}
            venueStaff={venueStaff}
            staffMembers={staffMembers}
            roles={roles}
            onChange={patch => onChange(key, patch)}
            onRemove={() => onRemove(key)}
            showRemove={drafts.length > 1}
          />
        ))}
      </div>

      <div className="border-border flex items-center justify-between gap-3 border-t px-5 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={confirming}>
          Back to editing
        </Button>
        <div className="flex items-center gap-2">
          <DialogClose render={<Button variant="outline" disabled={confirming} />}>
            Cancel
          </DialogClose>
          <Button onClick={onConfirm} disabled={readyCount === 0 || confirming}>
            {confirming && <Spinner data-icon="inline-start" />}
            Create {readyCount > 0 ? readyCount : ''} shift{readyCount === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </>
  );
}

interface DraftRowProps {
  draft: ParsedShiftDraft;
  venueStaff: StaffCandidate[];
  staffMembers: StaffMember[];
  roles: Role[];
  onChange: (patch: Partial<ParsedShiftDraft>) => void;
  onRemove: () => void;
  showRemove: boolean;
}

function DraftRow({
  draft,
  venueStaff,
  staffMembers,
  roles,
  onChange,
  onRemove,
  showRemove,
}: DraftRowProps) {
  const staffOptions =
    draft.staff.candidates.length > 0 ? draft.staff.candidates : venueStaff;

  const staffMember = staffMembers.find(s => s.id === draft.staff.resolvedId) ?? null;
  const role = staffMember?.primaryRoleId
    ? (roles.find(r => r.id === staffMember.primaryRoleId) ?? null)
    : null;
  const { rate } = resolveStaffRate(staffMember, role);

  const ready = isDraftReady(draft);

  let rateInfo: ReturnType<typeof getRateInfo> | null = null;
  if (draft.date && draft.startTime && draft.endTime) {
    const dayOfWeek = dayOfWeekForDate(draft.date);
    const mondayOfThatWeek = DateTime.fromISO(draft.date).minus({ days: dayOfWeek });
    rateInfo = getRateInfo(
      mondayOfThatWeek,
      dayOfWeek,
      draft.startTime,
      draft.endTime,
      UNPAID_BREAK_MINUTES_DEFAULT,
      rate,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground truncate font-mono text-[11px]">
          “{draft.rawInput}”
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={ready ? 'secondary' : 'outline'} className="capitalize">
            {draft.confidence}
          </Badge>
          {showRemove && (
            <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove">
              <XIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      <div>
        <Field className="col-span-2">
          <FieldLabel className="text-muted-foreground text-[11px]">Staff</FieldLabel>
          <Select
            items={staffOptions.map(s => ({ value: s.staffId, label: s.displayName }))}
            value={draft.staff.resolvedId ?? ''}
            onValueChange={value => {
              if (typeof value !== 'string' || value.length === 0) return;
              const picked =
                staffOptions.find(s => s.staffId === value) ??
                venueStaff.find(s => s.staffId === value);
              onChange({
                staff: {
                  resolvedId: value,
                  displayName: picked?.displayName ?? draft.staff.displayName,
                  candidates: [],
                },
              });
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Select staff…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(staffOptions.length > 0 ? staffOptions : venueStaff).map(s => (
                  <SelectItem key={s.staffId} value={s.staffId}>
                    {s.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <div className="mt-3">
          <Field>
            <FieldLabel className="text-muted-foreground text-xs">Date</FieldLabel>
            <Input
              type="date"
              value={draft.date ?? ''}
              onChange={e => onChange({ date: e.target.value || null })}
              className="h-8 text-sm"
            />
          </Field>
        </div>

        <div className="mt-3 flex gap-3">
          <Field>
            <FieldLabel className="text-muted-foreground text-xs">Start</FieldLabel>
            <Input
              type="time"
              value={draft.startTime ?? ''}
              onChange={e => onChange({ startTime: e.target.value || null })}
              className="h-8 text-sm tabular-nums"
            />
          </Field>

          <Field>
            <FieldLabel className="text-muted-foreground text-xs">End</FieldLabel>
            <InputGroup className="h-8 rounded-md">
              <InputGroupInput
                type="time"
                disabled={draft.openEnded && draft.endTime === null}
                value={draft.endTime ?? ''}
                onChange={e =>
                  onChange({ endTime: e.target.value || null, openEnded: false })
                }
                className="text-sm tabular-nums"
              />
            </InputGroup>
            {draft.openEnded && draft.endTime === null && (
              <button
                type="button"
                className="text-muted-foreground text-left text-[11px] underline"
                onClick={() => onChange({ endTime: '23:00' })}
              >
                "Until close" — set an end time
              </button>
            )}
          </Field>
        </div>
      </div>

      {draft.ambiguities.length > 0 && (
        <div className="flex flex-col gap-1">
          {draft.ambiguities.map(a => (
            <p
              key={a}
              className="text-muted-foreground flex items-start gap-1.5 text-[11px]"
            >
              <AlertTriangleIcon size={12} className="mt-0.5 shrink-0" />
              {a}
            </p>
          ))}
        </div>
      )}

      {draft.unconsumedTokens.length > 0 && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px]">
          <Trash2Icon size={12} className="mt-0.5 shrink-0" />
          Didn't understand: {draft.unconsumedTokens.join(', ')}
        </p>
      )}

      {rateInfo && (
        <div className="border-border text-muted-foreground flex items-center justify-between border-t border-dashed pt-2 text-xs">
          <span>{rate === null ? 'No award rate resolved yet' : rateInfo.label}</span>
          <span className="font-medium tabular-nums">
            {rateInfo.cost !== null ? currency2(rateInfo.cost) : '—'}
          </span>
        </div>
      )}
    </div>
  );
}
