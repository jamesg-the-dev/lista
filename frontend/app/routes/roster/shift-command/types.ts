// AI Shift Command Palette — Phase 1 (deterministic parser + confirmation
// UI, no LLM). See docs/features/FEATURE_AI_SHIFTS.md for the full spec.
// This file is the shared contract every parser pass and the confirmation
// UI are written against, so the UI layer never needs to import parsing
// internals — only this shape.
//
// Phase 1 scope decisions (agreed with the project owner before writing any
// of this, not deviations discovered later):
//
// - No `Section` entity and no named-shift-preset config exist anywhere in
//   this codebase yet — there is no Settings screen for either. Rather than
//   invent fake venue config to resolve against, `section` stays null on
//   every draft and no pass attempts to match section/preset tokens. Words
//   like "arvo"/"lunch"/"dinner" simply fall through to `unconsumedTokens`
//   (which is the correct behaviour — it's exactly the signal Phase 2's LLM
//   fallback is meant to pick up). Revisit once Settings grows a real
//   Sections/Presets screen.
// - `rawInput` is carried on the draft for the confirmation card's display
//   only. It is NOT sent to CreateShiftCommand or persisted server-side —
//   that needs a backend column + migration this phase deliberately
//   doesn't touch, per the spec's own "not a new write path" guiding
//   principle for Phase 1. Flagged as a follow-up (see CommandPalette.tsx's
//   TODO), not a silent drop of the audit-trail requirement.
// - `source: 'nlp-fallback'` is reserved for the LLM parser (Phase 2, not
//   built yet — see the spec's "LLM Fallback Parser" section, which states
//   the LLM's output uses this value). DeterministicNlpParser only ever
//   produces 'palette' (typed through the command palette, verb present or
//   not) or 'mention-shorthand' (a bare @mention with no leading verb).

import type { DateTime } from 'luxon';

export interface StaffCandidate {
  staffId: string;
  displayName: string;
}

export type ParseConfidence = 'high' | 'medium' | 'low';
export type ParseSource = 'palette' | 'mention-shorthand' | 'nlp-fallback';

export interface ParsedShiftDraft {
  rawInput: string; // audit trail — see file header re: not yet persisted
  venueId: string; // injected from page context, never parsed
  managerId: string; // injected from session, never parsed

  staff: {
    resolvedId: string | null; // null triggers a staff picker in the UI
    displayName: string; // what the manager typed
    candidates: StaffCandidate[];
  };

  date: string | null; // 'YYYY-MM-DD', venue-local
  startTime: string | null; // 'HH:mm', venue-local wall clock
  endTime: string | null; // 'HH:mm', venue-local wall clock
  endsNextDay: boolean;
  openEnded: boolean; // 'until close' — end deliberately unknown

  section: string | null; // always null in Phase 1 — see file header

  ambiguities: string[]; // surfaced in the confirmation card
  confidence: ParseConfidence;
  source: ParseSource;

  unconsumedTokens: string[]; // non-empty = would route to LLM fallback in Phase 2
}

export interface ParseContext {
  venueId: string;
  managerId: string;
  venueStaff: StaffCandidate[]; // active staff only, already scoped to the current venue
  viewedWeekStart: DateTime; // Monday of the week visible on the roster grid, venue-local
  now: DateTime; // venue-local "now", used for relative dates ("today"/"tomorrow")
}

export interface ParseRejection {
  rejected: true;
  message: string;
}

export interface ParseSuccess {
  rejected: false;
  drafts: ParsedShiftDraft[];
}

export type ParseResult = ParseRejection | ParseSuccess;

export function mustFindStaffCandidate(
  candidates: StaffCandidate[],
  staffId: string,
): StaffCandidate {
  const found = candidates.find(c => c.staffId === staffId);
  if (!found) throw new Error(`Unknown staffId in draft: ${staffId}`);
  return found;
}
