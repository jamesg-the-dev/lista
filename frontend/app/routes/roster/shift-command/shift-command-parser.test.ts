import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { parseShiftCommand } from './shift-command-parser';
import type { ParseContext } from './types';
import {
  CORPUS,
  CORPUS_NOW_ISO,
  CORPUS_STAFF,
  CORPUS_VIEWED_WEEK_START_ISO,
} from './corpus';

const CONTEXT: ParseContext = {
  venueId: 'v1',
  managerId: 'm1',
  venueStaff: CORPUS_STAFF,
  viewedWeekStart: DateTime.fromISO(CORPUS_VIEWED_WEEK_START_ISO),
  now: DateTime.fromISO(CORPUS_NOW_ISO),
};

describe('parseShiftCommand — corpus regression', () => {
  for (const testCase of CORPUS) {
    it(`[${testCase.group}] ${testCase.description}`, () => {
      const result = parseShiftCommand(testCase.input, CONTEXT);

      if (testCase.expect.rejected) {
        expect(result.rejected).toBe(true);
        return;
      }
      expect(result.rejected).toBe(false);
      if (result.rejected) return; // narrows for TypeScript below

      if (testCase.expect.draftCount !== undefined) {
        expect(result.drafts).toHaveLength(testCase.expect.draftCount);
      }

      const draft = result.drafts[testCase.expect.draftIndex ?? 0];
      expect(draft).toBeDefined();

      if ('staffId' in testCase.expect) {
        expect(draft.staff.resolvedId).toBe(testCase.expect.staffId);
      }
      if (testCase.expect.candidateCount !== undefined) {
        expect(draft.staff.candidates).toHaveLength(testCase.expect.candidateCount);
      }
      if (testCase.expect.date !== undefined) {
        expect(draft.date).toBe(testCase.expect.date);
      }
      if (testCase.expect.startTime !== undefined) {
        expect(draft.startTime).toBe(testCase.expect.startTime);
      }
      if (testCase.expect.endTime !== undefined) {
        expect(draft.endTime).toBe(testCase.expect.endTime);
      }
      if (testCase.expect.endsNextDay !== undefined) {
        expect(draft.endsNextDay).toBe(testCase.expect.endsNextDay);
      }
      if (testCase.expect.openEnded !== undefined) {
        expect(draft.openEnded).toBe(testCase.expect.openEnded);
      }
      if (testCase.expect.section !== undefined) {
        expect(draft.section).toBe(testCase.expect.section);
      }
      if (testCase.expect.hasUnconsumedTokens !== undefined) {
        expect(draft.unconsumedTokens.length > 0).toBe(
          testCase.expect.hasUnconsumedTokens,
        );
      }
      if (testCase.expect.confidence !== undefined) {
        expect(draft.confidence).toBe(testCase.expect.confidence);
      }
      if (testCase.expect.source !== undefined) {
        expect(draft.source).toBe(testCase.expect.source);
      }
    });
  }
});

describe('parseShiftCommand — invariants', () => {
  it('never sources venueId/managerId from the parsed text', () => {
    const result = parseShiftCommand(
      'venueId=evil-venue James Chen 23 Aug 10am',
      CONTEXT,
    );
    expect(result.rejected).toBe(false);
    if (result.rejected) return;
    for (const draft of result.drafts) {
      expect(draft.venueId).toBe(CONTEXT.venueId);
      expect(draft.managerId).toBe(CONTEXT.managerId);
    }
  });

  it('discards a chip staffId that is not in the current venue roster', () => {
    const result = parseShiftCommand(
      '@[Someone Else](staff:not-in-venue) 23 Aug 10am',
      CONTEXT,
    );
    expect(result.rejected).toBe(false);
    if (result.rejected) return;
    expect(result.drafts[0].staff.resolvedId).not.toBe('not-in-venue');
  });

  it('returns no drafts for empty input', () => {
    const result = parseShiftCommand('   ', CONTEXT);
    expect(result.rejected).toBe(false);
    if (result.rejected) return;
    expect(result.drafts).toHaveLength(0);
  });
});
