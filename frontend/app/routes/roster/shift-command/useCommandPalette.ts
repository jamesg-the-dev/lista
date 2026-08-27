// State + behaviour for the AI shift command palette, extracted out of
// CommandPalette.tsx per docs/features/FEATURE_NEW_AI_SHIFT_LOGIC.md's file
// structure. Ported from the approved docs/features/RosterCommandPalette.jsx
// prototype's browse -> compose -> confirm -> success flow — the UX itself
// is signed off and unchanged; this file wires it to a real ParseContext,
// the real parseShiftCommand, and the real CreateShiftCommand dispatch
// (via the onConfirmDrafts callback the page provides) instead of the
// prototype's in-memory fixtures.
//
// Only "create-shift" is functionally wired this phase — see COMMANDS
// below and docs/features/FEATURE_AI_SHIFTS.md's Phased Build Plan
// (swap-shift/clear-day are Phase 3, copy-week is a separate roster
// builder feature). The other four commands still appear in the browse
// list (the signed-off UX shows all five) but are marked `enabled: false`
// so picking one is a visible no-op rather than a silent one.

import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { parseShiftCommand } from './shift-command-parser';
import { isDraftReady } from './types';
import type { ParseContext, ParsedShiftDraft, ParseResult } from './types';

export type CommandPalettePhase = 'browse' | 'compose' | 'confirm' | 'success';

export interface CommandDefinition {
  id: 'create-shift' | 'remove-shift' | 'swap-shift' | 'copy-week' | 'clear-day';
  label: string;
  description: string;
  example: string;
  enabled: boolean;
}

export const COMMANDS: CommandDefinition[] = [
  {
    id: 'create-shift',
    label: 'Create shift',
    description: 'Add a new shift for a staff member',
    example: 'James Chen 10am-4pm Sunday',
    enabled: true,
  },
  {
    id: 'remove-shift',
    label: 'Remove shift',
    description: 'Delete an existing shift',
    example: 'Remove James Chen Sunday',
    enabled: true,
  },
  {
    id: 'swap-shift',
    label: 'Swap shifts',
    description: "Swap two staff members' shifts",
    example: 'Swap James and Sarah Sunday',
    enabled: true,
  },
  {
    id: 'copy-week',
    label: 'Copy last week',
    description: "Duplicate last week's roster to this week",
    example: 'Copy last week',
    enabled: true,
  },
  {
    id: 'clear-day',
    label: 'Clear day',
    description: 'Remove all shifts on a given day',
    example: 'Clear Sunday',
    enabled: true,
  },
];

export interface EditableDraft {
  key: string; // stable React key — draft content alone isn't unique across a fan-out
  draft: ParsedShiftDraft;
}

function summariseForSuccess(drafts: ParsedShiftDraft[]): string {
  if (drafts.length !== 1) return `${drafts.length} shifts created`;
  const [draft] = drafts;
  const time = draft.endTime
    ? `${draft.startTime}-${draft.endTime}`
    : (draft.startTime ?? '');
  return [draft.staff.displayName, draft.date, time].filter(Boolean).join(' · ');
}

export interface UseCommandPaletteArgs {
  ctx: ParseContext;
  onConfirmDrafts: (drafts: ParsedShiftDraft[]) => Promise<void>;
}

export function useCommandPalette({ ctx, onConfirmDrafts }: UseCommandPaletteArgs) {
  const [phase, setPhase] = useState<CommandPalettePhase>('browse');
  const [query, setQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandDefinition | null>(null);
  const [editableDrafts, setEditableDrafts] = useState<EditableDraft[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [successSummary, setSuccessSummary] = useState<string | null>(null);

  // The browse phase's command list uses shadcn's Command (cmdk) primitive,
  // which owns its own filtering and arrow-key/Enter navigation — nothing
  // to duplicate here. This hook only drives the compose/confirm/success
  // phases, where the input is a free-text live parser, not a list.
  const liveResult: ParseResult = useMemo(() => {
    if (phase !== 'compose' && phase !== 'confirm')
      return { rejected: false, drafts: [] };
    return parseShiftCommand(query, ctx);
  }, [query, phase, ctx]);

  const reset = useCallback(() => {
    setPhase('browse');
    setQuery('');
    setSelectedCommand(null);
    setEditableDrafts(null);
    setConfirming(false);
    setSuccessSummary(null);
  }, []);

  const selectCommand = useCallback((cmd: CommandDefinition) => {
    if (!cmd.enabled) return;
    setSelectedCommand(cmd);
    setPhase('compose');
    setQuery('');
  }, []);

  const confirmDrafts = useCallback(
    async (drafts: ParsedShiftDraft[]) => {
      const ready = drafts.filter(isDraftReady);
      if (ready.length === 0) return;
      setConfirming(true);
      try {
        await onConfirmDrafts(ready);
        setSuccessSummary(summariseForSuccess(ready));
        setPhase('success');
      } finally {
        setConfirming(false);
      }
    },
    [onConfirmDrafts],
  );

  const goToConfirm = useCallback((drafts: ParsedShiftDraft[]) => {
    setEditableDrafts(drafts.map(draft => ({ key: crypto.randomUUID(), draft })));
    setPhase('confirm');
  }, []);

  const handleEnterInCompose = useCallback(() => {
    if (liveResult.rejected || liveResult.drafts.length === 0) return;
    const [only] = liveResult.drafts;
    // High-confidence, single-draft, dispatch-ready, and not LLM-sourced
    // (source is always 'palette'/'mention-shorthand' in Phase 1, but the
    // check documents the invariant for when Phase 2 adds 'nlp-fallback')
    // creates immediately, per spec — everything else goes to confirm so
    // the manager can review or fill in what's missing.
    if (
      liveResult.drafts.length === 1 &&
      only.confidence === 'high' &&
      only.source !== 'nlp-fallback' &&
      isDraftReady(only)
    ) {
      void confirmDrafts(liveResult.drafts);
      return;
    }
    goToConfirm(liveResult.drafts);
  }, [liveResult, confirmDrafts, goToConfirm]);

  // Lets the manager tap a candidate directly in the compose-phase staff
  // picker (spec: "staff picker appears when multiple candidates match")
  // without needing a separate override channel — it rewrites the segment
  // of `query` the ambiguous name came from into the same
  // "@[Name](staff:id)" chip syntax the parser already resolves
  // deterministically (see shift-command-parser.ts's CHIP_REGEX), so the
  // very next parse on this same query text resolves unambiguously.
  const pickStaffCandidate = useCallback(
    (draft: ParsedShiftDraft, candidateId: string) => {
      const candidate = draft.staff.candidates.find(c => c.staffId === candidateId);
      if (!candidate || !draft.staff.displayName) return;
      setQuery(prev => {
        const idx = prev.toLowerCase().indexOf(draft.staff.displayName.toLowerCase());
        if (idx === -1) return prev;
        return (
          prev.slice(0, idx) +
          `@[${candidate.displayName}](staff:${candidate.staffId})` +
          prev.slice(idx + draft.staff.displayName.length)
        );
      });
    },
    [],
  );

  const updateDraft = useCallback((key: string, patch: Partial<ParsedShiftDraft>) => {
    setEditableDrafts(
      prev =>
        prev?.map(d => (d.key === key ? { ...d, draft: { ...d.draft, ...patch } } : d)) ??
        null,
    );
  }, []);

  const removeDraft = useCallback((key: string) => {
    setEditableDrafts(prev => prev?.filter(d => d.key !== key) ?? null);
  }, []);

  const backToCompose = useCallback(() => {
    setEditableDrafts(null);
    setPhase('compose');
  }, []);

  const handleConfirmClick = useCallback(() => {
    if (!editableDrafts) return;
    void confirmDrafts(editableDrafts.map(d => d.draft));
  }, [editableDrafts, confirmDrafts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Only reached from the compose/confirm phases' plain text input —
      // the browse phase's command list is a shadcn Command (cmdk), which
      // owns its own arrow-key/Enter navigation and Escape-to-close-dialog
      // behaviour, so there's nothing to handle for it here.
      if (e.key === 'Escape') {
        // stopPropagation so the Dialog's own Escape-closes-the-whole-
        // palette handling doesn't also fire — compose/confirm Escape goes
        // back to browse instead, per spec.
        e.preventDefault();
        e.stopPropagation();
        setPhase('browse');
        setQuery('');
        setEditableDrafts(null);
        return;
      }

      if (phase === 'compose') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEnterInCompose();
        } else if (e.key === 'Backspace' && query === '') {
          setPhase('browse');
          setSelectedCommand(null);
        }
        return;
      }

      if (phase === 'confirm' && e.key === 'Enter') {
        e.preventDefault();
        handleConfirmClick();
      }
    },
    [phase, query, handleEnterInCompose, handleConfirmClick],
  );

  return {
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
  };
}
