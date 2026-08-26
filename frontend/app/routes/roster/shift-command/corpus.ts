// Input variation corpus — doubles as the regression suite (parser.test.ts
// runs every case through parseShiftCommand). Not the full 94-case set from
// docs/features/FEATURE_AI_SHIFTS.md's "Deterministic Parser: Input
// Taxonomy" section, but at least one representative case per documented
// variation dimension (verb form, staff reference form, date form, time
// form, range form, word order, multi-staff/multi-day, recurrence
// rejection). Add to this list first when a real-world input is parsed
// wrong — that's what keeps this a living regression suite rather than a
// one-off smoke test.

export interface CorpusCase {
  description: string;
  input: string;
  // Partial expectations — only the fields relevant to what the case is
  // testing need to be asserted, everything else is left for the parser to
  // decide. `draftIndex` selects which produced draft to check when an
  // input is expected to fan out into multiple (defaults to 0).
  expect: {
    rejected?: boolean;
    draftIndex?: number;
    staffId?: string | null;
    date?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    endsNextDay?: boolean;
    openEnded?: boolean;
    draftCount?: number;
    hasUnconsumedTokens?: boolean;
    confidence?: 'high' | 'medium' | 'low';
  };
}

// A fixed, deterministic roster context every corpus case runs against.
// viewedWeekStart is a Monday; "now" sits on the Tuesday of that same week,
// matching how a manager would actually be looking at the grid.
export const CORPUS_VIEWED_WEEK_START_ISO = '2026-08-17'; // Monday
export const CORPUS_NOW_ISO = '2026-08-18T10:00:00'; // Tuesday, mid-morning

export const CORPUS_STAFF = [
  { staffId: 's1', displayName: 'James Chen' },
  { staffId: 's2', displayName: 'Sarah O’Brien' },
  { staffId: 's3', displayName: 'Anne-Marie Dubois' },
  { staffId: 's4', displayName: 'Zoë Nguyen' },
];

export const CORPUS: CorpusCase[] = [
  // --- Verbs ---
  {
    description: 'explicit /create-shift verb',
    input: '/create-shift James Chen 10am Sun 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: '"roster" verb',
    input: 'roster James Chen 10am Sunday 23 August',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: 'no verb at all',
    input: 'James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: 'verb mid-sentence filler ("can you please roster")',
    input: 'can you please roster James Chen for 10am on 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },

  // --- Staff reference forms ---
  {
    description: 'resolved chip',
    input: '@[James Chen](staff:s1) 10am Sun 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description:
      'chip with staffId not in venue roster is discarded, falls back to name match',
    input: '@[James Chen](staff:not-real) 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: 'full name',
    input: 'James Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    description: 'initial + surname',
    input: 'J Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    description: 'typo (transposition)',
    input: 'Jmaes Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    description: 'nickname',
    input: 'Jimmy 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    description: 'name with apostrophe',
    input: 'Sarah O’Brien 10am 23 Aug',
    expect: { staffId: 's2' },
  },
  {
    description: 'hyphenated name',
    input: 'Anne-Marie Dubois 10am 23 Aug',
    expect: { staffId: 's3' },
  },
  {
    description: 'diacritics',
    input: 'Zoe Nguyen 10am 23 Aug',
    expect: { staffId: 's4' },
  },
  {
    description: 'bare @ prefix, no verb -> mention-shorthand',
    input: '@James Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    description: 'unresolvable staff name stays unconsumed',
    input: 'Xylophone Person 10am 23 Aug',
    expect: { staffId: null, hasUnconsumedTokens: true, confidence: 'low' },
  },

  // --- Date forms ---
  {
    description: 'ISO date',
    input: 'James Chen 2026-08-23 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'Australian numeric, day-first, no year',
    input: 'James Chen 23/8 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'Australian numeric with 4-digit year',
    input: 'James Chen 23/08/2026 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'day + abbreviated month',
    input: 'James Chen 23 Aug 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'ordinal day + full month',
    input: 'James Chen 23rd August 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'month then day',
    input: 'James Chen August 23 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'bare weekday anchors to viewed week',
    input: 'James Chen Sunday 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: '"next" weekday anchors to the following week',
    input: 'James Chen next Sunday 10am',
    expect: { staffId: 's1', date: '2026-08-30' },
  },
  {
    description: 'relative "today"',
    input: 'James Chen today 4pm',
    expect: { staffId: 's1', date: '2026-08-18' },
  },
  {
    description: 'relative "tomorrow"',
    input: 'James Chen tomorrow 4pm',
    expect: { staffId: 's1', date: '2026-08-19' },
  },
  {
    description: 'abbreviated relative "tmrw"',
    input: 'James Chen tmrw 4pm',
    expect: { staffId: 's1', date: '2026-08-19' },
  },
  {
    description:
      'weekday + calendar date mismatch produces an ambiguity, calendar date still wins',
    input: 'James Chen Monday 23 August 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    description: 'multiple weekdays fan out into multiple drafts',
    input: 'James Chen Monday and Wednesday 10am',
    expect: { staffId: 's1', draftCount: 2 },
  },

  // --- Time forms ---
  {
    description: '24-hour colon',
    input: 'James Chen 23 Aug 16:00-22:00',
    expect: { staffId: 's1', startTime: '16:00', endTime: '22:00' },
  },
  {
    description: 'military 4-digit',
    input: 'James Chen 23 Aug 1600-2200',
    expect: { staffId: 's1', startTime: '16:00', endTime: '22:00' },
  },
  {
    description: 'named time "noon"',
    input: 'James Chen 23 Aug noon-4pm',
    expect: { staffId: 's1', startTime: '12:00', endTime: '16:00' },
  },

  // --- Range forms ---
  {
    description: 'hyphen-glued range',
    input: 'James Chen 23 Aug 10am-4pm',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'separator keyword "to"',
    input: 'James Chen 23 Aug 10am to 4pm',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'separator keyword "till"',
    input: 'James Chen 23 Aug 10am till 4pm',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'en-dash range',
    input: 'James Chen 23 Aug 10–4',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'midnight-crossing range',
    input: 'James Chen 23 Aug 8pm-2am',
    expect: { staffId: 's1', startTime: '20:00', endTime: '02:00', endsNextDay: true },
  },
  {
    description: 'open-ended "to close"',
    input: 'James Chen 23 Aug 6pm to close',
    expect: { staffId: 's1', startTime: '18:00', endTime: null, openEnded: true },
  },
  {
    description: 'duration form "for N hours"',
    input: 'James Chen 23 Aug 10am for 6 hours',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'duration form "Nhrs"',
    input: 'James Chen 23 Aug 10am 6hrs',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00' },
  },
  {
    description: 'ambiguous bare-number range infers plausible same-day length',
    input: 'James Chen 23 Aug 10-4',
    expect: { staffId: 's1', startTime: '10:00', endTime: '16:00', confidence: 'medium' },
  },

  // --- Word order ---
  {
    description: 'time, date, name order',
    input: '10am 23 Aug James Chen',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: 'name, time, date order',
    input: 'James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    description: 'date, name, time order',
    input: '23 Aug James Chen 10am',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },

  // --- Multiple staff ---
  {
    description: '"and"-joined staff fan out into multiple drafts',
    input: 'James Chen and Sarah O’Brien 23 Aug 10am',
    expect: { draftCount: 2 },
  },
  {
    description: 'comma-joined staff fan out into multiple drafts',
    input: 'James Chen, Sarah O’Brien 23 Aug 10am',
    expect: { draftCount: 2 },
  },

  // --- Recurrence rejection ---
  {
    description: '"every" is rejected as recurrence',
    input: 'James Chen every Sunday 10am-4pm',
    expect: { rejected: true },
  },
  {
    description: '"weekly" is rejected as recurrence',
    input: 'James Chen weekly 10am-4pm',
    expect: { rejected: true },
  },
  {
    description: 'bounded multi-day input is NOT treated as recurrence',
    input: 'James Chen Monday and Wednesday 10am-4pm',
    expect: { rejected: false, draftCount: 2 },
  },

  // --- Confidence grading ---
  {
    description: 'high confidence: staff+date+time resolved, no ambiguity',
    input: 'James Chen 23 Aug 10am-4pm',
    expect: { confidence: 'high' },
  },
  {
    description: 'medium confidence: end time missing',
    input: 'James Chen 23 Aug 10am',
    expect: { confidence: 'medium' },
  },
  {
    description: 'low confidence: no date at all',
    input: 'James Chen 10am-4pm',
    expect: { confidence: 'low' },
  },
];
