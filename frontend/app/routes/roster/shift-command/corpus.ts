// Input variation corpus — doubles as the regression suite
// (shift-command-parser.test.ts runs every case through parseShiftCommand).
// This is the ~94-case set from docs/features/FEATURE_NEW_AI_SHIFT_LOGIC.md,
// grouped exactly as that doc specifies (verb/staff/multi-staff/date/time/
// range/named/section/order/filler/multi-day/reject/edge) so the group
// breakdown stays auditable against the spec. Add to this list first when a
// real-world input is parsed wrong — that's what keeps this a living
// regression suite rather than a one-off smoke test.
//
// Two groups — "named" (shift presets: lunch/dinner/arvo/...) and "section"
// (FOH/kitchen/barista/...) — intentionally assert the *deferred* behaviour
// documented in shift-command-parser.ts's file header: neither has a real
// venue-configured data source anywhere in this codebase yet, so those
// tokens correctly fall through to `unconsumedTokens` rather than resolving
// to a fabricated time/section. "tonight" is the one exception, since it
// resolves to a date ("today") with no venue config needed at all.

export interface CorpusCase {
  group:
    | 'verb'
    | 'staff'
    | 'multi-staff'
    | 'date'
    | 'time'
    | 'range'
    | 'named'
    | 'section'
    | 'order'
    | 'filler'
    | 'multi-day'
    | 'reject'
    | 'edge';
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
    section?: string | null;
    draftCount?: number;
    candidateCount?: number;
    hasUnconsumedTokens?: boolean;
    confidence?: 'high' | 'medium' | 'low';
    source?: 'palette' | 'mention-shorthand' | 'nlp-fallback';
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
  // Two "Ryan"s exist purely to test the ambiguous-first-name-only case
  // (bare "Ryan" should surface both as candidates, not silently pick one).
  // Deliberately not a nickname-table name (unlike "James"/"Sarah") so it
  // doesn't also make the Jimmy/Sez alias cases ambiguous.
  { staffId: 's5', displayName: 'Ryan Walsh' },
  { staffId: 's6', displayName: 'Ryan Osei' },
];

// "Tom Hardy" is deliberately NOT in CORPUS_STAFF — it stands in for a
// former/inactive staff member the manager might still type from muscle
// memory. `ParseContext.venueStaff` is already scoped to active staff only
// (see route.tsx), so this exercises "not on the current roster" the same
// way a real departed staff member would, without needing an `isActive`
// flag on StaffCandidate that nothing else in the codebase has yet.

export const CORPUS: CorpusCase[] = [
  // ------------------------------------------------------------------
  // verb — all verb forms (8 cases)
  // ------------------------------------------------------------------
  {
    group: 'verb',
    description: 'explicit /create-shift verb',
    input: '/create-shift James Chen 10am Sun 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '/roster verb',
    input: '/roster James Chen 10am Sun 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"roster" verb',
    input: 'roster James Chen 10am Sunday 23 August',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"schedule" verb',
    input: 'schedule James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"put" verb',
    input: 'put James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"book" verb',
    input: 'book James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"assign" verb',
    input: 'assign James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'verb',
    description: '"pencil in" verb',
    input: 'pencil in James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },

  // ------------------------------------------------------------------
  // staff — all name matching forms (15 cases)
  // ------------------------------------------------------------------
  {
    group: 'staff',
    description: 'resolved chip',
    input: '@[James Chen](staff:s1) 10am Sun 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'staff',
    description: 'chip with staffId not in venue roster is discarded, falls back to name match',
    input: '@[James Chen](staff:not-real) 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'staff',
    description: 'full name',
    input: 'James Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    group: 'staff',
    description: 'first name only, unique',
    input: 'Sarah 10am 23 Aug',
    expect: { staffId: 's2' },
  },
  {
    group: 'staff',
    description: 'first name only, multiple candidates',
    input: 'Ryan 10am 23 Aug',
    expect: { staffId: null, candidateCount: 2 },
  },
  {
    group: 'staff',
    description: 'nickname "Jimmy"',
    input: 'Jimmy 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    group: 'staff',
    description: 'nickname "Sez"',
    input: 'Sez 10am 23 Aug',
    expect: { staffId: 's2' },
  },
  {
    group: 'staff',
    description: 'initial + surname',
    input: 'J Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    group: 'staff',
    description: 'typo (transposition)',
    input: 'Jmaes Chen 10am 23 Aug',
    expect: { staffId: 's1' },
  },
  {
    group: 'staff',
    description: 'name with apostrophe (straight quote typed, fuzzy-matches curly-quote record)',
    input: "Sarah O'Brien 10am 23 Aug",
    expect: { staffId: 's2' },
  },
  {
    group: 'staff',
    description: 'hyphenated name',
    input: 'Anne-Marie Dubois 10am 23 Aug',
    expect: { staffId: 's3' },
  },
  {
    group: 'staff',
    description: 'diacritics (typed without the diaeresis)',
    input: 'Zoe Nguyen 10am 23 Aug',
    expect: { staffId: 's4' },
  },
  {
    group: 'staff',
    description: 'bare @ prefix, no verb -> mention-shorthand source',
    input: '@James Chen 10am 23 Aug',
    expect: { staffId: 's1', source: 'mention-shorthand' },
  },
  {
    group: 'staff',
    description: 'former/inactive staff (not in venueStaff) fails to resolve',
    input: 'Tom Hardy 10am 23 Aug',
    expect: { staffId: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'staff',
    description: 'unresolvable staff name stays unconsumed',
    input: 'Xylophone Person 10am 23 Aug',
    expect: { staffId: null, hasUnconsumedTokens: true, confidence: 'low' },
  },

  // ------------------------------------------------------------------
  // multi-staff — "and", comma, "&" (3 cases)
  // ------------------------------------------------------------------
  {
    group: 'multi-staff',
    description: '"and"-joined staff fan out into multiple drafts',
    input: 'James Chen and Sarah O’Brien 23 Aug 10am',
    expect: { draftCount: 2 },
  },
  {
    group: 'multi-staff',
    description: 'comma-joined staff fan out into multiple drafts',
    input: 'James Chen, Sarah O’Brien 23 Aug 10am',
    expect: { draftCount: 2 },
  },
  {
    group: 'multi-staff',
    description: '"&"-joined staff fan out into multiple drafts',
    input: 'James Chen & Sarah O’Brien 23 Aug 10am',
    expect: { draftCount: 2 },
  },

  // ------------------------------------------------------------------
  // date — all date forms (20 cases)
  // ------------------------------------------------------------------
  {
    group: 'date',
    description: 'ISO date',
    input: 'James Chen 2026-08-23 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'Australian numeric, day-first, no year',
    input: 'James Chen 23/8 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'Australian numeric with 2-digit year',
    input: 'James Chen 23/08/26 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'Australian numeric with 4-digit year',
    input: 'James Chen 23/08/2026 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'day + abbreviated month',
    input: 'James Chen 23 Aug 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'ordinal day + full month',
    input: 'James Chen 23rd August 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'month then day',
    input: 'James Chen August 23 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'bare weekday anchors to viewed week',
    input: 'James Chen Sunday 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'weekday abbreviation',
    input: 'James Chen Sun 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: '"this Sunday" anchors to the viewed week',
    input: 'James Chen this Sunday 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: '"next Sunday" anchors to the following week',
    input: 'James Chen next Sunday 10am',
    expect: { staffId: 's1', date: '2026-08-30' },
  },
  {
    group: 'date',
    description: '"coming Friday" anchors to the viewed week',
    input: 'James Chen coming Friday 10am',
    expect: { staffId: 's1', date: '2026-08-21' },
  },
  {
    group: 'date',
    description: 'relative "today"',
    input: 'James Chen today 4pm',
    expect: { staffId: 's1', date: '2026-08-18' },
  },
  {
    group: 'date',
    description: 'relative "tomorrow"',
    input: 'James Chen tomorrow 4pm',
    expect: { staffId: 's1', date: '2026-08-19' },
  },
  {
    group: 'date',
    description: 'abbreviated relative "tmr"',
    input: 'James Chen tmr 4pm',
    expect: { staffId: 's1', date: '2026-08-19' },
  },
  {
    group: 'date',
    description: 'abbreviated relative "tmrw"',
    input: 'James Chen tmrw 4pm',
    expect: { staffId: 's1', date: '2026-08-19' },
  },
  {
    group: 'date',
    description: 'weekday + calendar date mismatch produces an ambiguity, calendar date still wins',
    input: 'James Chen Monday 23 August 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'fuzzy weekday typo ("Sundya") still anchors to the viewed week',
    input: 'James Chen Sundya 10am',
    expect: { staffId: 's1', date: '2026-08-23' },
  },
  {
    group: 'date',
    description: 'fuzzy month typo ("Setpember")',
    input: 'James Chen 23 Setpember 10am',
    expect: { staffId: 's1', date: '2026-09-23' },
  },
  {
    group: 'date',
    description: 'Australian day-first numeric is not confused for month-first',
    input: 'James Chen 3/4 10am',
    expect: { staffId: 's1', date: '2026-04-03' },
  },

  // ------------------------------------------------------------------
  // time — all time forms (9 cases)
  // ------------------------------------------------------------------
  {
    group: 'time',
    description: '12-hour with am suffix',
    input: 'James Chen 23 Aug 10am',
    expect: { startTime: '10:00' },
  },
  {
    group: 'time',
    description: '12-hour with space before suffix',
    input: 'James Chen 23 Aug 10 am',
    expect: { startTime: '10:00' },
  },
  {
    group: 'time',
    description: '12-hour uppercase suffix',
    input: 'James Chen 23 Aug 10AM',
    expect: { startTime: '10:00' },
  },
  {
    group: 'time',
    description: '12-hour with minutes, colon separator',
    input: 'James Chen 23 Aug 10:30am',
    expect: { startTime: '10:30' },
  },
  {
    group: 'time',
    description: '12-hour with minutes, dot separator',
    input: 'James Chen 23 Aug 10.30am',
    expect: { startTime: '10:30' },
  },
  {
    group: 'time',
    description: 'military 4-digit, morning',
    input: 'James Chen 23 Aug 1030',
    expect: { startTime: '10:30' },
  },
  {
    group: 'time',
    description: 'military 4-digit, afternoon',
    input: 'James Chen 23 Aug 1730',
    expect: { startTime: '17:30' },
  },
  {
    group: 'time',
    description: 'named time "noon"',
    input: 'James Chen 23 Aug noon',
    expect: { startTime: '12:00' },
  },
  {
    group: 'time',
    description: 'named time "midnight"',
    input: 'James Chen 23 Aug midnight',
    expect: { startTime: '00:00' },
  },

  // ------------------------------------------------------------------
  // range — all range forms (14 cases)
  // ------------------------------------------------------------------
  {
    group: 'range',
    description: 'hyphen-glued range',
    input: 'James Chen 23 Aug 10am-4pm',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'separator keyword "to"',
    input: 'James Chen 23 Aug 10am to 4pm',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'separator keyword "till"',
    input: 'James Chen 23 Aug 10am till 4pm',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'separator keyword "until"',
    input: 'James Chen 23 Aug 10am until 4pm',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'separator keyword "thru"',
    input: 'James Chen 23 Aug 10am thru 4pm',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'en-dash range',
    input: 'James Chen 23 Aug 10–4',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'midnight-crossing range',
    input: 'James Chen 23 Aug 8pm-2am',
    expect: { startTime: '20:00', endTime: '02:00', endsNextDay: true },
  },
  {
    group: 'range',
    description: 'open-ended "to close"',
    input: 'James Chen 23 Aug 6pm to close',
    expect: { startTime: '18:00', endTime: null, openEnded: true },
  },
  {
    group: 'range',
    description: 'open-ended "till late"',
    input: 'James Chen 23 Aug 6pm till late',
    expect: { startTime: '18:00', endTime: null, openEnded: true },
  },
  {
    group: 'range',
    description: 'duration form "for N hours"',
    input: 'James Chen 23 Aug 10am for 6 hours',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'duration form "Nhrs"',
    input: 'James Chen 23 Aug 10am 6hrs',
    expect: { startTime: '10:00', endTime: '16:00' },
  },
  {
    group: 'range',
    description: 'ambiguous bare-number range infers a plausible same-day length',
    input: 'James Chen 23 Aug 10-4',
    expect: { startTime: '10:00', endTime: '16:00', confidence: 'medium' },
  },
  {
    group: 'range',
    description: '24-hour colon range',
    input: 'James Chen 23 Aug 16:00-22:00',
    expect: { startTime: '16:00', endTime: '22:00' },
  },
  {
    group: 'range',
    description: 'military range',
    input: 'James Chen 23 Aug 1600-2200',
    expect: { startTime: '16:00', endTime: '22:00' },
  },

  // ------------------------------------------------------------------
  // named — shift presets (7 cases). All but "tonight" are deliberately
  // deferred — see file header.
  // ------------------------------------------------------------------
  {
    group: 'named',
    description: '"tonight" resolves to today\'s date (no preset time config needed)',
    input: 'James Chen tonight 10pm',
    // Confidence is 'medium', not 'high' — no end time was given, and a
    // missing end time is explicitly a medium-confidence condition per the
    // spec's grading table, independent of how the date/start resolved.
    expect: { date: '2026-08-18', startTime: '22:00', confidence: 'medium' },
  },
  {
    group: 'named',
    description: '"lunch" preset is deferred — no venue preset config exists yet',
    input: 'lunch 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'named',
    description: '"dinner" preset is deferred',
    input: 'dinner 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'named',
    description: '"opening" preset is deferred',
    input: 'opening 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'named',
    description: '"closing" preset is deferred',
    input: 'closing 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'named',
    description: '"arvo" preset is deferred',
    input: 'arvo 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'named',
    description: '"brekkie" preset is deferred',
    input: 'brekkie 23 Aug',
    expect: { startTime: null, hasUnconsumedTokens: true, confidence: 'low' },
  },

  // ------------------------------------------------------------------
  // section — venue sections (5 cases). All deferred — no Section entity
  // or Settings config exists yet, see file header.
  // ------------------------------------------------------------------
  {
    group: 'section',
    description: '"FOH" section token is deferred',
    input: 'James Chen FOH 23 Aug 10am',
    expect: { section: null, hasUnconsumedTokens: true },
  },
  {
    group: 'section',
    description: '"BOH" section token is deferred',
    input: 'James Chen BOH 23 Aug 10am',
    expect: { section: null, hasUnconsumedTokens: true },
  },
  {
    group: 'section',
    description: '"barista" section token is deferred',
    input: 'James Chen barista 23 Aug 10am',
    expect: { section: null, hasUnconsumedTokens: true },
  },
  {
    group: 'section',
    description: '"dishy" section token is deferred',
    input: 'James Chen dishy 23 Aug 10am',
    expect: { section: null, hasUnconsumedTokens: true },
  },
  {
    group: 'section',
    description: '"on the pass" section phrase is deferred',
    input: 'James Chen on the pass 23 Aug 10am',
    expect: { section: null, hasUnconsumedTokens: true },
  },

  // ------------------------------------------------------------------
  // order — any permutation of name / date / time (3 cases)
  // ------------------------------------------------------------------
  {
    group: 'order',
    description: 'time, date, name order',
    input: '10am 23 Aug James Chen',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'order',
    description: 'name, time, date order',
    input: 'James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'order',
    description: 'date, name, time order',
    input: '23 Aug James Chen 10am',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },

  // ------------------------------------------------------------------
  // filler — politeness phrases and incidental filler words (3 cases)
  // ------------------------------------------------------------------
  {
    group: 'filler',
    description: 'verb mid-sentence filler ("can you please roster")',
    input: 'can you please roster James Chen for 10am on 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'filler',
    description: '"pls" abbreviation',
    input: 'pls roster James Chen 10am 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },
  {
    group: 'filler',
    description: 'multiple filler words together ("for the shift at ... on")',
    input: 'book James Chen for the shift at 10am on 23 Aug',
    expect: { staffId: 's1', date: '2026-08-23', startTime: '10:00' },
  },

  // ------------------------------------------------------------------
  // multi-day — "Monday and Wednesday" (1 case)
  // ------------------------------------------------------------------
  {
    group: 'multi-day',
    description: 'multiple weekdays fan out into multiple drafts, not treated as recurrence',
    input: 'James Chen Monday and Wednesday 10am-4pm',
    expect: { rejected: false, staffId: 's1', draftCount: 2 },
  },

  // ------------------------------------------------------------------
  // reject — recurrence (2 cases)
  // ------------------------------------------------------------------
  {
    group: 'reject',
    description: '"every" is rejected as recurrence',
    input: 'James Chen every Sunday 10am-4pm',
    expect: { rejected: true },
  },
  {
    group: 'reject',
    description: '"fortnightly" is rejected as recurrence',
    input: 'James Chen fortnightly 10am-4pm',
    expect: { rejected: true },
  },

  // ------------------------------------------------------------------
  // edge — invalid dates, past dates, ambiguous input (4 cases)
  // ------------------------------------------------------------------
  {
    group: 'edge',
    description: 'a 4-digit year outside 2000-2100 is rejected outright, rest of input still parses',
    input: '23/08/1899 James Chen 10am',
    expect: { staffId: 's1', date: null, startTime: '10:00', confidence: 'low' },
  },
  {
    group: 'edge',
    description: 'an invalid calendar date (31 Feb) is safely ignored, never resolves to a bogus date',
    input: '10am 31 Feb',
    expect: { date: null, startTime: '10:00', hasUnconsumedTokens: true, confidence: 'low' },
  },
  {
    group: 'edge',
    description: 'a date more than ~6 months in the past rolls forward to next year',
    input: 'James Chen 5 Jan 10am',
    expect: { staffId: 's1', date: '2027-01-05' },
  },
  {
    group: 'edge',
    description: 'bare ambiguous standalone time is flagged, not silently guessed with confidence',
    input: 'James Chen 23 Aug 10',
    expect: { staffId: 's1', startTime: '10:00', confidence: 'medium' },
  },
];
