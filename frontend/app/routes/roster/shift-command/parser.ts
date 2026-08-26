// DeterministicNlpParser — see docs/features/FEATURE_AI_SHIFTS.md
// "Deterministic Parser" sections for the full input taxonomy and pass
// order this file implements. Pure function, no network, no React — safe to
// unit test directly (see parser.test.ts + corpus.ts).
//
// Implementation note on pass order: the spec lists filler-word removal
// (verbs, "for", "on", "at", "the", "a", "shift", "working", ...) as pass 1,
// before date/time extraction. This file instead strips generic filler
// words as the LAST pass, immediately before staff-name extraction — except
// for the small set of explicit slash-commands/verbs, which are stripped
// first so they can never be mistaken for a staff name. The reason: "for"
// is also the keyword the duration pass ("10am for 6 hours") depends on to
// detect a duration phrase. Stripping it globally before duration extraction
// would destroy that signal. Moving generic filler removal to the end has
// no effect on correctness — filler words carry no information any other
// pass needs — while stripping it first would actively break duration
// parsing. The spec's invariant ("ordering is load-bearing") is about
// stricter passes running before looser ones so looser passes can't steal
// their tokens; that invariant is preserved here, just with filler-word
// cleanup moved to not conflict with the duration pass.

import { DateTime } from 'luxon';
import type {
  ParseContext,
  ParseResult,
  ParsedShiftDraft,
  StaffCandidate,
} from './types';

// ---------------------------------------------------------------------------
// Recurrence rejection — checked before anything else. See spec: "Recurrence
// is rejected."
// ---------------------------------------------------------------------------

const RECURRENCE_REGEX = /\b(every|weekly|fortnightly|recurring|recurs?)\b/i;

// ---------------------------------------------------------------------------
// Shared vocab
// ---------------------------------------------------------------------------

const WEEKDAYS = [
  { index: 0, full: 'sunday', abbrevs: ['sun'] },
  { index: 1, full: 'monday', abbrevs: ['mon'] },
  { index: 2, full: 'tuesday', abbrevs: ['tue', 'tues'] },
  { index: 3, full: 'wednesday', abbrevs: ['wed', 'weds'] },
  { index: 4, full: 'thursday', abbrevs: ['thu', 'thur', 'thurs'] },
  { index: 5, full: 'friday', abbrevs: ['fri'] },
  { index: 6, full: 'saturday', abbrevs: ['sat'] },
] as const;

// Luxon weekday: 1=Monday..7=Sunday. WEEKDAYS above indexes 0=Sunday..6=Saturday
// (JS Date.getDay() convention) since that's the more common mental model for
// "which day of the week is this" in free text. Converted at the point of use.
function luxonWeekdayFor(sundayIndexedDay: number): number {
  return sundayIndexedDay === 0 ? 7 : sundayIndexedDay;
}

function weekdayPatternAlternation(): string {
  return WEEKDAYS.flatMap(w => [w.full, ...w.abbrevs]).join('|');
}

function findWeekdayByToken(token: string): (typeof WEEKDAYS)[number] | null {
  const t = token.toLowerCase();
  return (
    WEEKDAYS.find(w => w.full === t || (w.abbrevs as readonly string[]).includes(t)) ??
    null
  );
}

const MONTHS = [
  { index: 1, full: 'january', abbrev: 'jan' },
  { index: 2, full: 'february', abbrev: 'feb' },
  { index: 3, full: 'march', abbrev: 'mar' },
  { index: 4, full: 'april', abbrev: 'apr' },
  { index: 5, full: 'may', abbrev: 'may' },
  { index: 6, full: 'june', abbrev: 'jun' },
  { index: 7, full: 'july', abbrev: 'jul' },
  { index: 8, full: 'august', abbrev: 'aug' },
  { index: 9, full: 'september', abbrev: 'sep' },
  { index: 10, full: 'october', abbrev: 'oct' },
  { index: 11, full: 'november', abbrev: 'nov' },
  { index: 12, full: 'december', abbrev: 'dec' },
] as const;

function monthPatternAlternation(): string {
  return MONTHS.map(m => m.full).join('|') + '|' + MONTHS.map(m => m.abbrev).join('|');
}

function findMonthByToken(token: string): (typeof MONTHS)[number] | null {
  const t = token.toLowerCase();
  return MONTHS.find(m => m.full === t || m.abbrev === t) ?? null;
}

// Small, illustrative nickname table — not exhaustive. Real nickname
// resolution would need a per-staff "preferred name" field on StaffMember,
// which doesn't exist yet (see StaffMemberDto in ../../staff/types.ts).
// This hardcoded table covers the spec's own examples plus common AU/EN
// nicknames so the fuzzy-match pass below has something to try before
// falling back to edit-distance matching.
const NICKNAME_TABLE: Record<string, string[]> = {
  jimmy: ['james'],
  jim: ['james'],
  jamie: ['james'],
  sez: ['sarah'],
  saz: ['sarah'],
  bobby: ['robert'],
  rob: ['robert'],
  bob: ['robert'],
  liz: ['elizabeth'],
  beth: ['elizabeth'],
  mike: ['michael'],
  tom: ['thomas'],
  tommy: ['thomas'],
  alex: ['alexander', 'alexandra'],
  sam: ['samuel', 'samantha'],
  will: ['william'],
  billy: ['william'],
  dan: ['daniel'],
  danny: ['daniel'],
  andy: ['andrew'],
  matt: ['matthew'],
  chris: ['christopher'],
  nick: ['nicholas'],
  tony: ['anthony'],
  steve: ['steven', 'stephen'],
  ben: ['benjamin'],
  zac: ['zachary'],
  zach: ['zachary'],
  josh: ['joshua'],
};

// ---------------------------------------------------------------------------
// Damerau-Levenshtein distance (transpositions count as one edit, per spec)
// ---------------------------------------------------------------------------

export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost); // transposition
      }
    }
  }
  return d[al][bl];
}

function fuzzyThresholdFor(word: string): number {
  if (word.length <= 4) return 1;
  if (word.length <= 8) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Time token parsing
// ---------------------------------------------------------------------------

interface TimeToken {
  hour: number; // 0-23
  minute: number;
  meridiemKnown: boolean;
}

function parseTimeToken(raw: string): TimeToken | null {
  const t = raw.trim().toLowerCase();
  if (t === 'noon' || t === 'midday') return { hour: 12, minute: 0, meridiemKnown: true };
  if (t === 'midnight') return { hour: 0, minute: 0, meridiemKnown: true };

  // Colon/dot separated, optional am/pm — "16:00", "10:30am", "10.30pm"
  let m = t.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/);
  if (m) {
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const suffix = m[3];
    if (hour > 23 || minute > 59) return null;
    if (suffix) {
      hour = hour % 12;
      if (suffix === 'pm') hour += 12;
      return { hour, minute, meridiemKnown: true };
    }
    return { hour, minute, meridiemKnown: hour >= 13 || hour === 0 };
  }

  // Military 4 (or 3) digit — "1030", "1730", "930"
  m = t.match(/^(\d{3,4})$/);
  if (m) {
    const digits = m[1].padStart(4, '0');
    const hour = parseInt(digits.slice(0, 2), 10);
    const minute = parseInt(digits.slice(2), 10);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute, meridiemKnown: hour >= 13 || hour === 0 };
  }

  // 12-hour with am/pm suffix, no minutes — "10am", "10 pm"
  m = t.match(/^(\d{1,2})\s*(am|pm)$/);
  if (m) {
    let hour = parseInt(m[1], 10) % 12;
    if (m[2] === 'pm') hour += 12;
    return { hour, minute: 0, meridiemKnown: true };
  }

  // Bare number — ambiguous am/pm
  m = t.match(/^(\d{1,2})$/);
  if (m) {
    const hour = parseInt(m[1], 10);
    if (hour > 23) return null;
    return { hour: hour % 24, minute: 0, meridiemKnown: hour >= 13 };
  }

  return null;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function candidatesForToken(tok: TimeToken): number[] {
  if (tok.meridiemKnown) return [tok.hour];
  const base = tok.hour % 12;
  return [base, base + 12];
}

interface ResolvedRange {
  startTime: string;
  endTime: string | null;
  endsNextDay: boolean;
  openEnded: boolean;
  meridiemInferred: boolean;
}

// Resolves a start/end token pair, inferring am/pm when either side is
// ambiguous by preferring a same-day, 1-14-hour-long shift over a
// midnight-crossing one — per spec: "favouring same-day over
// midnight-crossing."
function resolveRange(startTok: TimeToken, endTok: TimeToken | 'open'): ResolvedRange {
  if (endTok === 'open') {
    // No second side to disambiguate against — default bare-hour starts in
    // the 1-6 range to pm (an evening shift ending "at close"/"late" is the
    // overwhelmingly common case for an open-ended shift), otherwise am.
    const meridiemInferred = !startTok.meridiemKnown;
    let hour = startTok.hour;
    if (!startTok.meridiemKnown) {
      hour =
        startTok.hour >= 1 && startTok.hour <= 6 ? startTok.hour + 12 : startTok.hour;
    }
    return {
      startTime: formatTime(hour, startTok.minute),
      endTime: null,
      endsNextDay: false,
      openEnded: true,
      meridiemInferred,
    };
  }

  const meridiemInferred = !startTok.meridiemKnown || !endTok.meridiemKnown;
  const startCandidates = candidatesForToken(startTok);
  const endCandidates = candidatesForToken(endTok);

  let best: { start: number; end: number; endsNextDay: boolean; score: number } | null =
    null;
  for (const s of startCandidates) {
    for (const e of endCandidates) {
      const startMin = s * 60 + startTok.minute;
      const endMinRaw = e * 60 + endTok.minute;
      const sameDayDuration = endMinRaw - startMin;
      const crossMidnightDuration = endMinRaw - startMin + 24 * 60;

      const tryOption = (duration: number, endsNextDay: boolean) => {
        if (duration <= 0 || duration > 14 * 60) return;
        // Prefer same-day over midnight-crossing, then prefer close to an
        // 8-hour shift as a plausibility tiebreak.
        const score = (endsNextDay ? 1000 : 0) + Math.abs(duration - 8 * 60);
        if (!best || score < best.score) {
          best = { start: s, end: e, endsNextDay, score };
        }
      };
      if (sameDayDuration > 0) tryOption(sameDayDuration, false);
      else tryOption(crossMidnightDuration, true);
    }
  }

  // Fall back to the literal values if nothing scored as plausible (e.g. an
  // explicitly-stated, unusually long shift) — never silently drop a range
  // the manager typed.
  const resolvedStart = best ? (best as { start: number }).start : startCandidates[0];
  const resolvedEnd = best ? (best as { end: number }).end : endCandidates[0];
  const resolvedEndsNextDay = best
    ? (best as { endsNextDay: boolean }).endsNextDay
    : resolvedEnd * 60 + endTok.minute <= resolvedStart * 60 + startTok.minute;

  return {
    startTime: formatTime(resolvedStart, startTok.minute),
    endTime: formatTime(resolvedEnd, endTok.minute),
    endsNextDay: resolvedEndsNextDay,
    openEnded: false,
    meridiemInferred,
  };
}

// ---------------------------------------------------------------------------
// Working-string mutation helpers — each pass removes what it consumes so
// later, looser passes can't steal the same tokens (per spec).
// ---------------------------------------------------------------------------

interface ExtractionState {
  text: string;
  date: string | null; // resolved by an earlier pass in this same parse
  startTime: string | null;
  endTime: string | null;
  endsNextDay: boolean;
  openEnded: boolean;
  ambiguities: string[];
  multiDates: string[] | null; // set when multiple weekdays were listed
}

// Military 4-(or 3-)digit form must be tried before the 1-2 digit form —
// regex alternation is ordered, and "\d{1,2}" would otherwise greedily
// match just the first two digits of e.g. "1600", leaving "00" dangling.
const TIME_TOKEN_SOURCE =
  '(?:\\d{3,4}|\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?|noon|midday|midnight)';

function extractExplicitDate(state: ExtractionState, ctx: ParseContext): void {
  // ISO
  let m = state.text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    const dt = DateTime.fromISO(`${m[1]}-${m[2]}-${m[3]}`);
    if (dt.isValid) {
      state.date = dt.toISODate();
      state.text = state.text.replace(m[0], ' ');
      return;
    }
  }
  // Australian day-first numeric — d/m or d/m/yy(yy)
  m = state.text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const yearRaw = m[3];
    const year = yearRaw
      ? yearRaw.length === 2
        ? 2000 + parseInt(yearRaw, 10)
        : parseInt(yearRaw, 10)
      : ctx.now.year;
    const dt = DateTime.fromObject({ year, month, day });
    if (dt.isValid) {
      state.date = dt.toISODate();
      state.text = state.text.replace(m[0], ' ');
    }
  }
}

function extractDayMonthDate(state: ExtractionState, ctx: ParseContext): void {
  if (state.date) return;
  const weekdayAlt = weekdayPatternAlternation();
  const monthAlt = monthPatternAlternation();

  // Optional leading weekday qualifier, e.g. "Sunday 23 August"
  let m = state.text.match(
    new RegExp(
      `\\b(?:(${weekdayAlt})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})\\b`,
      'i',
    ),
  );
  let day: number, monthToken: string, weekdayToken: string | undefined;
  if (m) {
    weekdayToken = m[1];
    day = parseInt(m[2], 10);
    monthToken = m[3];
  } else {
    // "August 23" form
    m = state.text.match(
      new RegExp(`\\b(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'),
    );
    if (!m) return;
    monthToken = m[1];
    day = parseInt(m[2], 10);
  }

  const month = findMonthByToken(monthToken);
  if (!month) return;
  const year = ctx.now.year;
  let dt = DateTime.fromObject({ year, month: month.index, day });
  if (!dt.isValid) return;
  // If the resolved date is more than ~6 months in the past, assume the
  // manager means next year's occurrence (typing a date near year-end/start).
  if (dt < ctx.now.minus({ months: 6 })) {
    dt = dt.plus({ years: 1 });
  }
  state.date = dt.toISODate();
  state.text = state.text.replace(m[0], ' ');

  if (weekdayToken) {
    const weekday = findWeekdayByToken(weekdayToken);
    if (weekday && dt.weekday !== luxonWeekdayFor(weekday.index)) {
      state.ambiguities.push(
        `"${weekdayToken}" doesn't match ${dt.toFormat('d LLLL')}, which is a ${dt.toFormat('cccc')}`,
      );
    }
  }
}

function extractMultiWeekday(state: ExtractionState, ctx: ParseContext): void {
  if (state.date) return;
  const weekdayAlt = weekdayPatternAlternation();
  const re = new RegExp(
    `\\b(${weekdayAlt})\\b(?:\\s*(?:,|&|\\+|and)\\s*(${weekdayAlt})\\b)+`,
    'i',
  );
  const m = state.text.match(re);
  if (!m) return;

  const tokens = m[0].match(new RegExp(`\\b(?:${weekdayAlt})\\b`, 'gi'));
  if (!tokens || tokens.length < 2) return;

  const dates = tokens
    .map(t => findWeekdayByToken(t))
    .filter((w): w is (typeof WEEKDAYS)[number] => w !== null)
    .map(w => {
      const luxonWeekday = luxonWeekdayFor(w.index);
      return ctx.viewedWeekStart.plus({ days: luxonWeekday - 1 }).toISODate()!;
    });

  state.multiDates = dates;
  state.text = state.text.replace(m[0], ' ');
}

function extractRelativeOrNamedDate(state: ExtractionState, ctx: ParseContext): void {
  if (state.date || state.multiDates) return;

  let m = state.text.match(/\b(today)\b/i);
  if (m) {
    state.date = ctx.now.toISODate();
    state.text = state.text.replace(m[0], ' ');
    return;
  }
  m = state.text.match(/\b(tomorrow|tmr|tmrw)\b/i);
  if (m) {
    state.date = ctx.now.plus({ days: 1 }).toISODate();
    state.text = state.text.replace(m[0], ' ');
    return;
  }

  const weekdayAlt = weekdayPatternAlternation();
  m = state.text.match(
    new RegExp(`\\b(?:(this|next|coming)\\s+)?(${weekdayAlt})\\b`, 'i'),
  );
  if (m) {
    const qualifier = m[1]?.toLowerCase();
    const weekday = findWeekdayByToken(m[2]);
    if (weekday) {
      const luxonWeekday = luxonWeekdayFor(weekday.index);
      const anchorWeekStart =
        qualifier === 'next'
          ? ctx.viewedWeekStart.plus({ weeks: 1 })
          : ctx.viewedWeekStart;
      state.date = anchorWeekStart.plus({ days: luxonWeekday - 1 }).toISODate();
      state.text = state.text.replace(m[0], ' ');
    }
  }
}

function extractDaypart(state: ExtractionState, ctx: ParseContext): void {
  // Only "tonight" is handled — it's an unambiguous date signal (today).
  // Other daypart/preset words (arvo, lunch, dinner, opening, closing,
  // brekkie) need venue-configured preset times that don't exist yet in
  // this codebase — see types.ts's file header. They're deliberately left
  // in the text to fall through to unconsumedTokens.
  if (state.date) return;
  const m = state.text.match(/\btonight\b/i);
  if (m) {
    state.date = ctx.now.toISODate();
    state.text = state.text.replace(m[0], ' ');
  }
}

function extractTimeRange(state: ExtractionState): void {
  // Glued or en-dash range: "10am-4pm", "10–4"
  let m = state.text.match(
    new RegExp(`\\b(${TIME_TOKEN_SOURCE})\\s*[-–]\\s*(${TIME_TOKEN_SOURCE})\\b`, 'i'),
  );
  if (m) {
    const startTok = parseTimeToken(m[1]);
    const endTok = parseTimeToken(m[2]);
    if (startTok && endTok) {
      const resolved = resolveRange(startTok, endTok);
      applyResolvedRange(state, resolved);
      state.text = state.text.replace(m[0], ' ');
      return;
    }
  }

  // Separator-keyword range: "10am to 4pm", "6pm till late"
  m = state.text.match(
    new RegExp(
      `\\b(${TIME_TOKEN_SOURCE})\\s+(?:to|till|until|thru)\\s+(${TIME_TOKEN_SOURCE}|close|late)\\b`,
      'i',
    ),
  );
  if (m) {
    const startTok = parseTimeToken(m[1]);
    if (!startTok) return;
    const endWord = m[2].toLowerCase();
    if (endWord === 'close' || endWord === 'late') {
      applyResolvedRange(state, resolveRange(startTok, 'open'));
      state.text = state.text.replace(m[0], ' ');
      return;
    }
    const endTok = parseTimeToken(m[2]);
    if (endTok) {
      applyResolvedRange(state, resolveRange(startTok, endTok));
      state.text = state.text.replace(m[0], ' ');
    }
  }
}

function applyResolvedRange(state: ExtractionState, resolved: ResolvedRange): void {
  state.startTime = resolved.startTime;
  state.endTime = resolved.endTime;
  state.endsNextDay = resolved.endsNextDay;
  state.openEnded = resolved.openEnded;
  if (resolved.meridiemInferred) {
    state.ambiguities.push('am/pm was inferred');
  }
}

function extractDuration(state: ExtractionState): void {
  if (state.startTime) return;
  let m = state.text.match(
    new RegExp(
      `\\b(${TIME_TOKEN_SOURCE})\\s+for\\s+(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?)\\b`,
      'i',
    ),
  );
  if (!m) {
    m = state.text.match(
      new RegExp(
        `\\b(${TIME_TOKEN_SOURCE})\\s+(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?)\\b`,
        'i',
      ),
    );
  }
  if (!m) return;
  const startTok = parseTimeToken(m[1]);
  if (!startTok) return;
  const durationHours = parseFloat(m[2]);

  const meridiemInferred = !startTok.meridiemKnown;
  const startHour = !startTok.meridiemKnown
    ? startTok.hour >= 1 && startTok.hour <= 6
      ? startTok.hour + 12
      : startTok.hour
    : startTok.hour;

  const startTotalMin = startHour * 60 + startTok.minute;
  const endTotalMin = startTotalMin + Math.round(durationHours * 60);
  const endsNextDay = endTotalMin >= 24 * 60;
  const normalisedEndMin = endTotalMin % (24 * 60);

  state.startTime = formatTime(startHour, startTok.minute);
  state.endTime = formatTime(Math.floor(normalisedEndMin / 60), normalisedEndMin % 60);
  state.endsNextDay = endsNextDay;
  if (meridiemInferred) state.ambiguities.push('am/pm was inferred');
  state.text = state.text.replace(m[0], ' ');
}

function extractStandaloneTime(state: ExtractionState): void {
  if (state.startTime) return;
  const m = state.text.match(new RegExp(`\\b(${TIME_TOKEN_SOURCE})\\b`, 'i'));
  if (!m) return;
  const tok = parseTimeToken(m[1]);
  if (!tok) return;
  if (!tok.meridiemKnown) {
    state.ambiguities.push('am/pm was inferred');
  }
  state.startTime = formatTime(tok.hour, tok.minute);
  state.text = state.text.replace(m[0], ' ');
}

// ---------------------------------------------------------------------------
// Filler-word cleanup — run last, see file header for why "for" isn't in
// this list (the duration pass above already consumes it when relevant).
// ---------------------------------------------------------------------------

const FILLER_WORDS = [
  'pencil in',
  'can you please',
  'can you',
  'please',
  'pls',
  'create-shift',
  'create shift',
  '\\/create-shift',
  '\\/roster',
  'roster',
  'schedule',
  'put',
  'book',
  'assign',
  'chuck',
  'slot',
  'working',
  'shift',
  'for',
  'on',
  'at',
  'the',
  'a',
];

function stripFillerWords(text: string): string {
  const alternation = FILLER_WORDS.join('|');
  return text.replace(new RegExp(`\\b(?:${alternation})\\b`, 'gi'), ' ');
}

// ---------------------------------------------------------------------------
// Staff name extraction
// ---------------------------------------------------------------------------

interface StaffMatchResult {
  resolvedId: string | null;
  displayName: string;
  candidates: StaffCandidate[];
  unconsumed: string[];
  ambiguity: string | null;
}

function matchStaffSegment(
  segment: string,
  venueStaff: StaffCandidate[],
): StaffMatchResult | null {
  const cleaned = segment.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return null;

  // Exact full-name match (case-insensitive)
  const exact = venueStaff.filter(
    s => s.displayName.toLowerCase() === cleaned.toLowerCase(),
  );
  if (exact.length === 1) {
    return {
      resolvedId: exact[0].staffId,
      displayName: cleaned,
      candidates: [],
      unconsumed: [],
      ambiguity: null,
    };
  }

  // Initial + surname — "J Chen"
  const initialMatch = cleaned.match(/^([a-z])\.?\s+([a-z'-]+)$/i);
  if (initialMatch) {
    const initial = initialMatch[1].toLowerCase();
    const surname = initialMatch[2].toLowerCase();
    const matches = venueStaff.filter(s => {
      const parts = s.displayName.toLowerCase().split(/\s+/);
      return parts[0]?.[0] === initial && parts[parts.length - 1] === surname;
    });
    if (matches.length === 1) {
      return {
        resolvedId: matches[0].staffId,
        displayName: cleaned,
        candidates: [],
        unconsumed: [],
        ambiguity: null,
      };
    }
    if (matches.length > 1) {
      return {
        resolvedId: null,
        displayName: cleaned,
        candidates: matches,
        unconsumed: [],
        ambiguity: `"${cleaned}" matched multiple staff — please pick one`,
      };
    }
  }

  // Nickname table — try each mapped first name against every staff member's
  // first name.
  const nicknameTargets = NICKNAME_TABLE[cleaned.toLowerCase()];
  if (nicknameTargets) {
    const matches = venueStaff.filter(s => {
      const firstName = s.displayName.split(/\s+/)[0]?.toLowerCase();
      return firstName && nicknameTargets.includes(firstName);
    });
    if (matches.length === 1) {
      return {
        resolvedId: matches[0].staffId,
        displayName: cleaned,
        candidates: [],
        unconsumed: [],
        ambiguity: null,
      };
    }
    if (matches.length > 1) {
      return {
        resolvedId: null,
        displayName: cleaned,
        candidates: matches,
        unconsumed: [],
        ambiguity: `"${cleaned}" matched multiple staff — please pick one`,
      };
    }
  }

  // Fuzzy match (Damerau-Levenshtein) against full name and first name —
  // catches typos/transpositions ("Jmaes Chen") per spec.
  const threshold = fuzzyThresholdFor(cleaned);
  const scored = venueStaff
    .map(s => {
      const full = s.displayName.toLowerCase();
      const first = full.split(/\s+/)[0] ?? full;
      const distance = Math.min(
        damerauLevenshtein(cleaned.toLowerCase(), full),
        damerauLevenshtein(cleaned.toLowerCase(), first),
      );
      return { staff: s, distance };
    })
    .filter(r => r.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);

  if (scored.length > 0) {
    const bestDistance = scored[0].distance;
    const tied = scored.filter(r => r.distance === bestDistance);
    if (tied.length === 1) {
      return {
        resolvedId: tied[0].staff.staffId,
        displayName: cleaned,
        candidates: [],
        unconsumed: [],
        ambiguity:
          bestDistance > 0
            ? `Matched "${cleaned}" to ${tied[0].staff.displayName} (fuzzy match)`
            : null,
      };
    }
    return {
      resolvedId: null,
      displayName: cleaned,
      candidates: tied.map(r => r.staff),
      unconsumed: [],
      ambiguity: `"${cleaned}" matched multiple staff — please pick one`,
    };
  }

  return {
    resolvedId: null,
    displayName: cleaned,
    candidates: [],
    unconsumed: [cleaned],
    ambiguity: `Could not match staff "${cleaned}"`,
  };
}

function extractStaffSegments(
  text: string,
  venueStaff: StaffCandidate[],
): StaffMatchResult[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return [];
  const segments = cleaned
    .split(/\s*(?:,|&|\+|\band\b)\s*/i)
    .filter(s => s.trim().length > 0);
  return segments
    .map(seg => matchStaffSegment(seg, venueStaff))
    .filter((r): r is StaffMatchResult => r !== null);
}

// ---------------------------------------------------------------------------
// Confidence grading — see spec's "Confidence Grading" table.
// ---------------------------------------------------------------------------

function gradeConfidence(
  draft: Omit<ParsedShiftDraft, 'confidence'>,
): ParsedShiftDraft['confidence'] {
  const coreFieldsPresent =
    draft.staff.resolvedId !== null && draft.date !== null && draft.startTime !== null;
  if (!coreFieldsPresent || draft.unconsumedTokens.length > 0) return 'low';

  const meridiemInferred = draft.ambiguities.some(a => a === 'am/pm was inferred');
  const endMissing = draft.endTime === null && !draft.openEnded;
  if (meridiemInferred || endMissing || draft.ambiguities.length > 0) return 'medium';
  return 'high';
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

// Chip emitted by the palette's token-command path, e.g.
// "@[James Chen](staff:s1)". Kept as a regex here rather than a separate
// TokenCommandParser class — the spec's chip format only ever carries a
// staffId, so resolving it is a single lookup, not a distinct parsing
// strategy worth its own implementation for Phase 1.
const CHIP_REGEX = /@\[([^\]]+)\]\(staff:([^)]+)\)/;

export function parseShiftCommand(rawInput: string, ctx: ParseContext): ParseResult {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return { rejected: false, drafts: [] };
  }
  if (RECURRENCE_REGEX.test(trimmed)) {
    return {
      rejected: true,
      message:
        'Recurring shifts aren’t supported here — use "Copy previous week" to repeat a roster instead.',
    };
  }

  let workingText = trimmed;
  let preResolvedStaff: StaffCandidate | null = null;
  let source: ParsedShiftDraft['source'] = 'palette';

  const chipMatch = workingText.match(CHIP_REGEX);
  if (chipMatch) {
    const [full, chipName, chipId] = chipMatch;
    const validated = ctx.venueStaff.find(s => s.staffId === chipId);
    if (validated) {
      // Chip staffId is validated against the live roster, not trusted at
      // face value — a staffId absent from venueStaff is discarded (per
      // spec) and the chip's display name falls through to fuzzy matching
      // below instead.
      preResolvedStaff = validated;
      workingText = workingText.replace(full, ' ');
    } else {
      workingText = workingText.replace(full, ` ${chipName} `);
    }
  } else {
    const verbPresent = new RegExp(
      `\\b(?:${FILLER_WORDS.filter(w => w !== 'for' && w !== 'on' && w !== 'at' && w !== 'the' && w !== 'a' && w !== 'shift' && w !== 'working').join('|')})\\b`,
      'i',
    ).test(workingText);
    if (!verbPresent && /^@/.test(trimmed)) {
      source = 'mention-shorthand';
    }
    workingText = workingText.replace(/^@/, ' ');
  }

  const state: ExtractionState = {
    text: workingText,
    date: null,
    startTime: null,
    endTime: null,
    endsNextDay: false,
    openEnded: false,
    ambiguities: [],
    multiDates: null,
  };

  extractExplicitDate(state, ctx);
  extractTimeRange(state);
  extractDayMonthDate(state, ctx);
  extractMultiWeekday(state, ctx);
  extractRelativeOrNamedDate(state, ctx);
  extractDaypart(state, ctx);
  extractDuration(state);
  extractStandaloneTime(state);
  // Section detection intentionally omitted — see types.ts's file header.

  const nameText = stripFillerWords(state.text);
  const staffMatches = preResolvedStaff
    ? [
        {
          resolvedId: preResolvedStaff.staffId,
          displayName: preResolvedStaff.displayName,
          candidates: [],
          unconsumed: [],
          ambiguity: null,
        } satisfies StaffMatchResult,
      ]
    : extractStaffSegments(nameText, ctx.venueStaff);

  const dates = state.multiDates ?? [state.date];
  const staffList =
    staffMatches.length > 0
      ? staffMatches
      : [
          {
            resolvedId: null,
            displayName: '',
            candidates: [],
            unconsumed: [],
            ambiguity: null,
          } satisfies StaffMatchResult,
        ];

  const drafts: ParsedShiftDraft[] = [];
  for (const staffMatch of staffList) {
    for (const date of dates) {
      const ambiguities = [...state.ambiguities];
      if (staffMatch.ambiguity) ambiguities.push(staffMatch.ambiguity);
      const unconsumedTokens = [...staffMatch.unconsumed];

      const base: Omit<ParsedShiftDraft, 'confidence'> = {
        rawInput: trimmed,
        venueId: ctx.venueId,
        managerId: ctx.managerId,
        staff: {
          resolvedId: staffMatch.resolvedId,
          displayName: staffMatch.displayName,
          candidates: staffMatch.candidates,
        },
        date,
        startTime: state.startTime,
        endTime: state.endTime,
        endsNextDay: state.endsNextDay,
        openEnded: state.openEnded,
        section: null,
        ambiguities,
        source,
        unconsumedTokens,
      };
      drafts.push({ ...base, confidence: gradeConfidence(base) });
    }
  }

  return { rejected: false, drafts };
}
