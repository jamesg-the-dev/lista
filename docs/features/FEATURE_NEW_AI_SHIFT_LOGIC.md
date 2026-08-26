# Task: Implement the AI Roster Command Palette

## Before starting

Read these files in this order before writing any code:

1. `FEATURE_AI_SHIFTS.md` — full architecture spec, parser design, 
   input taxonomy, security requirements, and the reasoning behind every 
   decision. This is the source of truth for *why* things are built the 
   way they are.

2. `RosterCommandPalette.jsx` — the approved UI prototype. The UX in this 
   file has been signed off. Do not change it, only port it to TypeScript 
   and wire it to real app context.

Then delete the existing implementation before starting:
- Any existing command palette component
- Any existing shift/roster command parser or matching logic  
- Any existing command input or search handler on the roster page

Do not attempt to extend or reconcile them with the new implementation.
The architectural approach is incompatible.

## Context

Read these two files before writing any code:

- `FEATURE_AI_SHIFT_COMMAND.md` — full architecture spec, parser design, input taxonomy, security requirements
- `src/features/shift-command/RosterCommandPalette.jsx` — the reference UI prototype (drop this into the repo alongside this prompt)

This feature is a slash-command palette that lets managers type natural language to create shifts. It is a **new front door** to the existing `CreateShiftCommand` MediatR pipeline — nothing about the write path changes.

---

## What to build

### 1. File structure

Create the following under `src/features/shift-command/`:

```
types.ts                  # ParsedShiftDraft, ParseContext, StaffSummary, helpers
shift-command-parser.ts   # DeterministicNlpParser — all extraction passes
corpus.ts                 # 94-case regression corpus
run-tests.ts              # Test runner
CommandPalette.tsx         # Main palette component (see UI spec below)
useCommandPalette.ts      # State hook extracted from the component
index.ts                  # Barrel export
```

### 2. Parser (`shift-command-parser.ts`)

Implement `parseShiftCommand(rawInput: string, ctx: ParseContext): ParseResult`.

The parser is **client-side only** — no network calls, no async. It runs on every keystroke in the palette input. All data it needs (`venueStaff`, `viewedWeekStart`, `venueTimezone`, `namedShiftPresets`) comes from the `ParseContext` injected by the page — not fetched inside the parser.

**Extraction passes in this exact order (order is load-bearing):**

1. Verb and filler removal
2. Explicit dates (ISO `2026-08-23`, Australian numeric `23/8`, `23/08/26`)
3. Time ranges — glued (`10am-4pm`), separator (`10am to 4pm`, `10am till close`), en-dash (`10–4`)
4. Day-month calendar dates (`23 August`, `August 23`, `23rd Aug`)
5. Relative and named dates (`today`, `tomorrow`, `tmr`, `this Sunday`, `next Friday`)
6. Daypart tokens (`tonight`, `arvo`, `dinner`, `closing`, `brekkie`)
7. Duration (`for 6 hours`, `10am 6hrs`)
8. Standalone times — last resort, bare numbers only after date pass is done
9. Section detection (`bar`, `FOH`, `kitchen`, `on the pass`)
10. Staff name extraction — everything remaining after all other passes

**Critical parser behaviours — implement all of these:**

- Use **Damerau-Levenshtein** (transpositions = 1 edit) for fuzzy name matching, not plain Levenshtein. This catches `Jmaes`, `Sundya`, `Setpember`.
- Fuzzy tolerance scales with word length: ≤4 chars → 0, ≤6 chars → 1, else → 2.
- Meridiem inference ranks by plausible shift length (1–14h), preferring same-day (am→pm) over midnight-crossing. All inferences set `"am/pm inferred"` in `ambiguities`.
- When a weekday name sits next to an explicit calendar date (`Sunday 25 August`), consume the weekday as a qualifier and cross-check it — emit a warning if it does not match the resolved date. Do **not** emit a second draft date.
- A weekday name standing alone anchors to `ctx.viewedWeekStart` (the week on screen), not today.
- `venueId` and `managerId` are **never** parsed from text. They are stamped from `ctx`.
- `@mention` chip `staffId` values are validated against `ctx.venueStaff`. A `staffId` absent from the list is discarded.
- Recurrence tokens (`every`, `weekly`, `fortnightly`) return a `ParseRejection`, not a draft.
- `unconsumedTokens` is the routing signal for the LLM fallback — populate it honestly.
- A 4-digit token is only treated as a year if it is in the range 2000–2100 (prevents `1030` being eaten as a year).

**Staff matching forms to support:**

| Form | Example |
|---|---|
| Resolved chip | `@[James Chen](staff:s1)` |
| Full name | `James Chen` |
| First name only | `James` (may produce multiple candidates) |
| Nickname / alias | `Jimmy`, `Sez` |
| Initial + surname | `J Chen` |
| Transposition typo | `Jmaes Chen` |
| Apostrophe names | `Sarah O'Brien` |
| Hyphenated names | `Anne-Marie Dubois` |
| Diacritics | `Zoë Nguyen` |
| Bare `@` prefix | `@James Chen` |

**Date forms to support:** `23 August`, `23rd August`, `August 23`, `23 Aug`, `23/8`, `23/08/26`, `23/08/2026`, `2026-08-23`, `Sunday`, `Sun`, `this Sunday`, `next Sunday`, `coming Friday`, `today`, `tomorrow`, `tmr`, `tmrw`, `Monday and Wednesday` (produces two drafts), `Sunday 23 August` (qualifier, not second date).

**Time forms to support:** `10am`, `10 am`, `10AM`, `10:30am`, `10.30am`, `1030`, `1730`, `noon`, `midday`, `midnight`, bare `10` (flagged as ambiguous).

**Range forms to support:** `10am-4pm`, `10am to 4pm`, `10am till 4pm`, `10am until 4pm`, `10am thru 4pm`, `10–4`, `8pm-2am` (sets `endsNextDay: true`), `10am to close`, `6pm till late`, `10am for 6 hours`, `10am 6hrs`.

**Named shift presets:** Resolved from `ctx.namedShiftPresets`. Examples: `lunch`, `dinner`, `opening`, `closing`, `arvo`, `brekkie`, `tonight`.

**Filler words consumed silently:** `for`, `on`, `at`, `please`, `pls`, `can you`, `the`, `a`, `shift`, `working`, and all verb tokens wherever they appear in the string.

**Verb tokens (all equivalent):** `/create-shift`, `/roster`, `roster`, `schedule`, `put`, `book`, `assign`, `pencil in`, or no verb.

**Confidence grading:**

| Grade | Condition |
|---|---|
| `high` | Staff resolved, date present, start time present, no inferred meridiem, no unconsumed tokens |
| `medium` | Core fields present but meridiem inferred, end time missing, or minor ambiguity |
| `low` | Any core field missing, or unconsumed tokens remain |

### 3. Regression corpus (`corpus.ts`)

The corpus is not optional — it is the contract the parser must satisfy. Write at minimum these groups of cases, each as `{ group, input, expect }` objects:

- `verb` — all verb forms (8 cases)
- `staff` — all name matching forms including typos, aliases, diacritics, archived staff (15 cases)
- `multi-staff` — `and`, comma, multiple chips (3 cases)
- `date` — all date forms (20 cases)
- `time` — all time forms (9 cases)
- `range` — all range forms including midnight-crossing and open-ended (14 cases)
- `named` — preset names including `tonight`, `arvo`, `brekkie` (7 cases)
- `section` — `FOH`, `on the pass`, `barista` etc (5 cases)
- `order` — any permutation of name / date / time (3 cases)
- `filler` — politeness phrases like `can you please roster` (3 cases)
- `multi-day` — `Monday and Wednesday` (1 case)
- `reject` — recurrence and empty input (2 cases)
- `edge` — invalid dates, past dates, ambiguous input (4 cases)

Run the corpus with `node --experimental-strip-types run-tests.ts` and iterate until **all cases pass** before moving on to the component.

### 4. Component (`CommandPalette.tsx`)

The reference prototype in `RosterCommandPalette.jsx` shows the exact UX. Rewrite it as a proper TypeScript React component wired to your real app context. Do not change the UX — it has been approved.

**Phases:**

| Phase | What renders |
|---|---|
| `browse` | Figma-style command list, filters on keystroke, `↑↓↵` navigation |
| `compose` | Selected command in prefix, live parse chips update on every keystroke, staff picker appears when multiple candidates match, Enter on `high` confidence creates immediately |
| `confirm` | Chip summary + ambiguity warnings, Edit / Create shift buttons |
| `success` | Checkmark, auto-closes after 1.6s |

**Key UX rules — do not deviate:**

- `/` anywhere on the roster page (when no input is focused) opens the palette
- `⌘K` opens/closes the palette
- `Backspace` on empty input in `compose` phase returns to `browse`
- `Escape` in `compose`/`confirm` returns to `browse`; in `browse` closes the palette
- The confirmation step is **always shown** for `nlp-fallback` sourced drafts
- High-confidence drafts (`high`) create on `Enter` in `compose` without needing the confirm step
- Nothing is written until the manager explicitly confirms (or hits Enter on a `high` confidence parse)
- The `ParsedShiftDraft` confirmation card must support inline editing of all chip values before commit

**Chip display rules:**

- Resolved chip (staff resolved, date known, time certain): accent colour
- Inferred chip (meridiem guessed, preset applied): warning colour with `~` tilde
- Missing chip (field absent): muted/ghost with em dash placeholder

**Wire the confirmed draft to:**

```typescript
// Existing command — do not change this interface
dispatch(new CreateShiftCommand({
  venueId: draft.venueId,
  managerId: draft.managerId,
  staffId: draft.staff.resolvedId,
  date: draft.date,
  startTime: draft.startTime,
  endTime: draft.endTime,
  endsNextDay: draft.endsNextDay,
  openEnded: draft.openEnded,
  section: draft.section,
}));
```

### 5. Page integration

Wire the palette into the roster page:

```typescript
// In RosterPage.tsx (or equivalent)
// 1. Listen for "/" keydown when no input is focused → open palette
// 2. Pass page context to palette:
const paletteCtx: ParseContext = {
  venueId: venue.id,
  managerId: currentUser.id,
  venueStaff: roster.activeStaff,
  venueTimezone: venue.timezone,      // IANA string e.g. 'Australia/Melbourne'
  now: new Date(),
  viewedWeekStart: roster.weekStart,  // ISO date of the Monday on screen
  namedShiftPresets: venue.shiftPresets,
  sections: venue.sections,
};
```

---

## What NOT to change

- The `CreateShiftCommand` MediatR handler and its validation pipeline
- `IRosterComplianceValidator` — it runs unchanged after a shift is created
- The roster grid, budget bar, or any other roster page component
- The existing shift create/edit form (the palette is an additional entry point, not a replacement)

---

## Security checklist — verify before opening a PR

- [ ] `venueId` and `managerId` sourced from session/page context only, never from parsed text
- [ ] Staff resolution only searches `ctx.venueStaff` — cross-venue lookup is impossible by construction
- [ ] Chip `staffId` validated against `ctx.venueStaff` before use
- [ ] No LLM call in the deterministic parser path — zero network requests on keystroke
- [ ] `unconsumedTokens` is non-empty before any LLM fallback is invoked (Phase 2, not this PR)
- [ ] Raw input logged to audit trail alongside the resulting shift record
- [ ] Venue/staff display names sanitised before re-entering any prompt context (Phase 2 prep)

---

## Definition of done

- [ ] `node --experimental-strip-types run-tests.ts` passes all corpus cases with no failures
- [ ] Parser handles every input form in the taxonomy table with correct output
- [ ] Palette opens on `/` and `⌘K`, closes on `Escape`
- [ ] Browse → compose → confirm → success flow works end to end
- [ ] High-confidence parse creates on `Enter` without the confirm step
- [ ] Ambiguous staff (multiple candidates) shows inline picker, not a dialog
- [ ] Confirmed draft dispatches `CreateShiftCommand` through the existing pipeline
- [ ] Compliance warnings surface normally (they come from the existing validator, no change needed)
- [ ] No TypeScript errors, no `any` types in the parser or the `ParsedShiftDraft` contract