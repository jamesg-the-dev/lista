// AI Shift Command Palette. Opened by pressing "/" or Cmd/Ctrl+K on the
// roster page (wired in route.tsx). Ported from the approved
// docs/features/RosterCommandPalette.jsx prototype's browse -> compose ->
// confirm -> success flow — see docs/features/FEATURE_AI_SHIFTS.md and
// docs/features/FEATURE_NEW_AI_SHIFT_LOGIC.md. The UX itself is signed off
// and unchanged; this file is the real TypeScript component wired to real
// app context (useCommandPalette.ts owns the state/behaviour, this file is
// rendering only).
//
// Only "create-shift" is functionally wired this phase — see
// useCommandPalette.ts's COMMANDS list. The confirm phase reuses
// ConfirmationCard, which already supports full inline editing of every
// chip value before commit (staff/date/start/end), same requirement as the
// prototype's "Edit" affordance, just richer than the prototype's
// read-only chip summary since Phase 1 has no separate edit mode to fall
// back into.

import { useEffect } from 'react';
import { DateTime } from 'luxon';
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  CheckIcon,
  CopyIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  XCircleIcon,
} from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
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
  InputGroupText,
} from '~/components/ui/input-group';

import { ConfirmationCard } from './ConfirmationCard';
import type { CommandDefinition } from './useCommandPalette';
import { COMMANDS, useCommandPalette } from './useCommandPalette';
import type { ParseContext, ParsedShiftDraft, StaffCandidate } from './types';
import type { Role, StaffMember } from '../types';

const COMMAND_ICONS: Record<CommandDefinition['id'], typeof PlusCircleIcon> = {
  'create-shift': PlusCircleIcon,
  'remove-shift': MinusCircleIcon,
  'swap-shift': ArrowLeftRightIcon,
  'copy-week': CopyIcon,
  'clear-day': XCircleIcon,
};

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

function PreviewRow({
  draft,
  onPickStaff,
}: {
  draft: ParsedShiftDraft;
  onPickStaff: (staffId: string) => void;
}) {
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

      {/* Inline staff picker — spec: "staff picker appears when multiple
          candidates match". Tapping a candidate rewrites the query with a
          resolved chip (see pickStaffCandidate) rather than mutating the
          draft directly, so the parser stays the single source of truth. */}
      {draft.staff.candidates.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-[11px]">Who?</span>
          {draft.staff.candidates.map(c => (
            <button
              key={c.staffId}
              type="button"
              onClick={() => onPickStaff(c.staffId)}
              className="border-border hover:bg-accent hover:text-accent-foreground rounded-full border px-2.5 py-0.5 text-xs transition-colors"
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

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
  const ctx: ParseContext = {
    venueId,
    managerId,
    venueStaff,
    viewedWeekStart,
    now: DateTime.now(),
  };

  const {
    phase,
    query,
    setQuery,
    selectedCommand,
    liveResult,
    editableDrafts,
    confirming,
    successSummary,
    reset,
    selectCommand,
    pickStaffCandidate,
    updateDraft,
    removeDraft,
    backToCompose,
    handleConfirmClick,
    handleKeyDown,
  } = useCommandPalette({ ctx, onConfirmDrafts });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  // Success phase auto-closes after a beat — same 1.6s the approved
  // prototype uses.
  useEffect(() => {
    if (phase !== 'success') return undefined;
    const timeout = setTimeout(() => handleOpenChange(false), 1600);
    return () => clearTimeout(timeout);
    // handleOpenChange is stable enough for this purpose — re-running the
    // timeout on every render would just restart the same 1.6s countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>AI shift command</DialogTitle>
        <DialogDescription>
          Type a verb, a staff name, a date and a time — in any order.
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className={`max-h-[85dvh] max-w-lg gap-0 overflow-hidden rounded-xl p-0 ${phase === 'confirm' ? 'h-full' : ''}`}
      >
        {phase === 'browse' && (
          <Command>
            <CommandInput placeholder="Search commands…" autoFocus />
            <CommandList className="mt-2">
              <CommandEmpty>No commands match.</CommandEmpty>
              {COMMANDS.map(cmd => {
                const Icon = COMMAND_ICONS[cmd.id];
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.description} ${cmd.id}`}
                    disabled={!cmd.enabled}
                    onSelect={() => selectCommand(cmd)}
                  >
                    <Icon className="text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2">
                        {cmd.label}
                        {!cmd.enabled && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Coming soon
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {cmd.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        )}

        {phase === 'compose' && selectedCommand && (
          <>
            <InputGroup className="h-11 border-none ring-0!">
              <InputGroupAddon>
                <InputGroupText className="font-medium">
                  {selectedCommand.label}
                </InputGroupText>
                <span className="text-gray-400">&rsaquo;</span>
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`e.g. "${selectedCommand.example}"`}
                className="text-sm"
              />
            </InputGroup>

            <div className="border-border max-h-80 overflow-y-auto border-t p-4">
              {query.trim().length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Type a staff name, a date and a time — in any order. e.g. &quot;
                  {selectedCommand.example}&quot;.
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
                    <PreviewRow
                      key={i}
                      draft={draft}
                      onPickStaff={staffId => pickStaffCandidate(draft, staffId)}
                    />
                  ))}
                  <p className="text-muted-foreground text-[11px]">
                    {liveResult.drafts.length === 1 &&
                    liveResult.drafts[0].confidence === 'high' ? (
                      <>
                        Press{' '}
                        <kbd className="border-border rounded border px-1">Enter</kbd> to
                        create.
                      </>
                    ) : (
                      <>
                        Press{' '}
                        <kbd className="border-border rounded border px-1">Enter</kbd> to
                        review before creating.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'confirm' && editableDrafts && (
          <ConfirmationCard
            drafts={editableDrafts}
            venueStaff={venueStaff}
            staffMembers={staffMembers}
            roles={roles}
            onChange={updateDraft}
            onRemove={removeDraft}
            onBack={backToCompose}
            onConfirm={handleConfirmClick}
            confirming={confirming}
          />
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="bg-success-tint text-success flex size-10 items-center justify-center rounded-full">
              <CheckIcon className="size-5" />
            </div>
            <p className="text-sm font-medium">Shift created</p>
            {successSummary && (
              <p className="text-muted-foreground text-xs">{successSummary}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
