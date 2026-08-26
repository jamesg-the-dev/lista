// AI Shift Command Palette — Phase 1. Opened by pressing "/" on the roster
// page (wired in route.tsx). See docs/features/FEATURE_AI_SHIFTS.md.
//
// TODO(Phase 1 follow-up, agreed scope call): the spec's UX shows typed
// tokens resolving into interactive INLINE chips as the manager types
// (Notion/Linear-style mention editor). Building that well is a
// substantial custom contentEditable component in its own right, so Phase 1
// ships a plain text input instead (shadcn's Input) with a live preview
// strip rendered below it that shows the same resolved fields as read-only
// badges, re-parsed on every keystroke. The manager sees the same
// information before confirming either way — revisit true inline chips as
// a follow-up polish pass, not a functional gap.
//
// Only the create-shift verb is wired up this phase. swap-shift/clear-day
// are Phase 3 per the spec (each needs its own confirmation design — a
// swap has a different blast radius than adding a shift, and a bulk clear
// needs an undo affordance) — this palette doesn't offer them yet.

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { DateTime } from 'luxon';
import { AlertTriangleIcon, SearchIcon } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';

import { ConfirmationCard, type EditableDraft } from './ConfirmationCard';
import { parseShiftCommand } from './parser';
import type { ParseContext, ParsedShiftDraft, StaffCandidate } from './types';
import type { Role, StaffMember } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  managerId: string;
  venueStaff: StaffCandidate[];
  staffMembers: StaffMember[];
  roles: Role[];
  viewedWeekStart: DateTime;
  onConfirmDrafts: (drafts: ParsedShiftDraft[]) => Promise<void>;
}

function PreviewRow({ draft }: { draft: ParsedShiftDraft }) {
  const dateLabel = draft.date
    ? DateTime.fromISO(draft.date).toFormat('ccc d LLL')
    : 'no date yet';
  const timeLabel = draft.startTime
    ? `${draft.startTime}${draft.endTime ? `–${draft.endTime}` : draft.openEnded ? '–close' : ''}`
    : 'no time yet';

  return (
    <div className="border-border bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={draft.staff.resolvedId ? 'secondary' : 'destructive'}>
          {draft.staff.displayName || 'No staff yet'}
        </Badge>
        <Badge variant="outline">{dateLabel}</Badge>
        <Badge variant="outline">{timeLabel}</Badge>
        <Badge
          variant={draft.confidence === 'high' ? 'secondary' : 'outline'}
          className="ml-auto capitalize"
        >
          {draft.confidence}
        </Badge>
      </div>
      {draft.ambiguities.map(a => (
        <p key={a} className="text-muted-foreground text-[11px]">
          {a}
        </p>
      ))}
      {draft.unconsumedTokens.length > 0 && (
        <p className="text-destructive text-[11px]">
          Didn&apos;t understand: {draft.unconsumedTokens.join(', ')}
        </p>
      )}
    </div>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  venueId,
  managerId,
  venueStaff,
  staffMembers,
  roles,
  viewedWeekStart,
  onConfirmDrafts,
}: CommandPaletteProps) {
  const [rawInput, setRawInput] = useState('');
  const [editableDrafts, setEditableDrafts] = useState<EditableDraft[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const ctx: ParseContext = useMemo(
    () => ({ venueId, managerId, venueStaff, viewedWeekStart, now: DateTime.now() }),
    [venueId, managerId, venueStaff, viewedWeekStart],
  );

  const liveResult = useMemo(() => parseShiftCommand(rawInput, ctx), [rawInput, ctx]);

  function reset() {
    setRawInput('');
    setEditableDrafts(null);
    setConfirming(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (liveResult.rejected || liveResult.drafts.length === 0) return;
    setEditableDrafts(
      liveResult.drafts.map(draft => ({ key: crypto.randomUUID(), draft })),
    );
  }

  function updateDraft(key: string, patch: Partial<ParsedShiftDraft>) {
    setEditableDrafts(
      prev =>
        prev?.map(d => (d.key === key ? { ...d, draft: { ...d.draft, ...patch } } : d)) ??
        null,
    );
  }

  function removeDraft(key: string) {
    setEditableDrafts(prev => prev?.filter(d => d.key !== key) ?? null);
  }

  async function handleConfirm() {
    if (!editableDrafts) return;
    const ready = editableDrafts
      .map(d => d.draft)
      .filter(
        d =>
          d.staff.resolvedId !== null &&
          d.date !== null &&
          d.startTime !== null &&
          d.endTime !== null,
      );
    if (ready.length === 0) return;
    setConfirming(true);
    try {
      await onConfirmDrafts(ready);
      handleOpenChange(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>AI shift command</DialogTitle>
        <DialogDescription>
          Type a staff member, a date and a time to add a shift.
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className="top-1/4 max-w-lg translate-y-0 gap-0 overflow-hidden rounded-xl p-0"
      >
        {!editableDrafts ? (
          <>
            <div className="p-1">
              <InputGroup className="h-11 rounded-lg">
                <InputGroupInput
                  autoFocus
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Try "James Chen 10am Sunday 23 Aug"'
                  className="text-sm"
                />
                <InputGroupAddon>
                  <SearchIcon className="size-4 opacity-50" />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="border-border max-h-80 overflow-y-auto border-t p-4">
              {rawInput.trim().length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Type a verb (optional), a staff name, a date and a time — in any order.
                  e.g. &quot;roster James Chen 10am Sun 23 Aug&quot; or &quot;Jimmy sat
                  dinner 5-close&quot;.
                </p>
              ) : liveResult.rejected ? (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
                  <p>{liveResult.message}</p>
                </div>
              ) : liveResult.drafts.length === 0 ? (
                <p className="text-muted-foreground text-xs">Keep typing…</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {liveResult.drafts.map((draft, i) => (
                    <PreviewRow key={i} draft={draft} />
                  ))}
                  <p className="text-muted-foreground text-[11px]">
                    Press <kbd className="border-border rounded border px-1">Enter</kbd>{' '}
                    to review before creating.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <ConfirmationCard
            drafts={editableDrafts}
            venueStaff={venueStaff}
            staffMembers={staffMembers}
            roles={roles}
            onChange={updateDraft}
            onRemove={removeDraft}
            onBack={() => setEditableDrafts(null)}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
