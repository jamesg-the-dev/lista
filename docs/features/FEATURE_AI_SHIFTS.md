# Feature: AI Shift Command Palette

## Overview

A slash-command interface that lets managers add shifts by typing natural language. Pressing `/` opens a command palette. The manager types a verb, a staff name, a date, and a time in any order and any phrasing. A client-side deterministic parser resolves the input instantly into a typed `ParsedShiftDraft`. A confirmation card is shown before any write occurs. Only unresolvable inputs fall through to an LLM fallback.

This feature is a **new front door** to the existing `CreateShiftCommand` MediatR pipeline — not a new write path. The parser is purely additive.

---

## UX Flow

1. Manager presses `/` on the roster page for a venue.
2. A command palette opens listing available verbs: `create-shift`, `swap-shift`, `clear-day`.
3. Manager selects `create-shift` (or keeps typing free text).
4. As they type, tokens resolve into interactive chips inline:
   - `@James Chen` → resolved staff chip (backed by a real `staffId`)
   - `Sunday 23 Aug` → date chip with a tooltip showing the resolved ISO date
   - `10am–4pm` → time chip, underlined if am/pm was inferred
5. Manager presses **Enter** → a confirmation card renders showing the full draft.
6. Manager confirms (or edits any chip) → `POST /shifts` fires a single `CreateShiftCommand`.

**Nothing is written until the manager explicitly confirms.** The parser can be wrong; the confirmation step is the safety net.

---

## Entry Points

Two paths feed the same `ParsedShiftDraft` shape:

| Path | Example | Notes |
|---|---|---|
| Structured command | `/create-shift @[James Chen](staff:s1) 10am Sun 23 Aug` | Chip carries a resolved `staffId`; verb is explicit |
| Free text | `roster Jimmy sat dinner` | Parser infers everything; lower initial confidence |

Both terminate in the same confirmation card and the same downstream command handler. A bare `@mention` without a leading verb defaults to `create-shift` as the implied intent.

---

## Architecture

### Guiding principle: the AI is a parser, not an actor

The LLM never touches the `CreateShiftCommand` directly. It maps free text → `ParsedShiftDraft`. All writes go through the existing validated MediatR pipeline unchanged.

### Parser chain (client-side only)

Three implementations of `IShiftDraftParser`, tried in order:

```
TokenCommandParser          (chip-based, zero ambiguity)
    ↓ if confidence < medium
DeterministicNlpParser      (regex + fuzzy match, no network call)
    ↓ if unconsumedTokens.length > 0
LlmFallbackParser           (constrained function-calling, network)
```

The deterministic parser handles the overwhelming majority of real inputs. The LLM fallback fires only when the deterministic parser leaves unconsumed tokens it cannot account for.

### Client-side only (deterministic parser)

The deterministic parser runs entirely in the browser with zero network calls. It uses only data that is already loaded on the roster page:

- Venue staff list (already fetched to render the grid)
- Viewed week start (already in roster page state)
- Venue timezone (already in venue context)
- Named shift presets (already loaded as venue config)
- `Date.now()` (local)

Latency: effectively zero. Works offline or on poor connectivity mid-service.

---

## The `ParsedShiftDraft` Contract

Every parser implementation — regardless of which path resolved the input — must emit this shape. The confirmation UI and the `CreateShiftCommand` handoff are written once against this contract.

```typescript
type ParsedShiftDraft = {
  rawInput: string;              // audit trail
  venueId: string;               // injected from page context, never parsed
  managerId: string;             // injected from session, never parsed

  staff: {
    resolvedId: string | null;   // null triggers a staff picker in the UI
    displayName: string;         // what the manager typed
    candidates: StaffCandidate[];
  };

  date: string | null;           // 'YYYY-MM-DD', venue-local
  startTime: string | null;      // 'HH:mm', venue-local wall clock
  endTime: string | null;        // 'HH:mm', venue-local wall clock
  endsNextDay: boolean;
  openEnded: boolean;            // 'until close' — end deliberately unknown

  section: string | null;

  ambiguities: string[];         // surface these in the confirmation chip UI
  confidence: 'high' | 'medium' | 'low';
  source: 'palette' | 'mention-shorthand' | 'nlp-fallback';

  unconsumedTokens: string[];    // non-empty = route to LLM fallback
};
```

**Critical invariants:**

- `venueId` and `managerId` are **never** sourced from parsed text. They are stamped from session and page context server-side. This is the tenant-isolation guarantee — no parser path can cause a cross-venue write.
- `staff.resolvedId` is validated against the current venue's staff list even when it arrives via a chip. A `staffId` not present in `venueStaff` is discarded.
- Dates are venue-local wall clock. UTC conversion happens exactly once, server-side, using the venue's IANA timezone. This keeps DST bugs out of the parser entirely.

---

## Deterministic Parser: Input Taxonomy

The parser must handle the following variation dimensions. Real inputs combine all of them simultaneously.

### Verbs (all treated as equivalent)
`/create-shift`, `/roster`, `roster`, `schedule`, `put`, `book`, `assign`, `pencil in`, `chuck`, `slot`, or no verb at all.

### Staff reference forms
| Form | Example |
|---|---|
| Resolved chip | `@[James Chen](staff:s1)` |
| Full name | `James Chen` |
| First name only | `James` (may produce multiple candidates) |
| Nickname / alias | `Jimmy`, `Sez` |
| Initial + surname | `J Chen` |
| Typo (transposition) | `Jmaes Chen`, `Sundya` |
| Names with apostrophes | `Sarah O'Brien` |
| Hyphenated names | `Anne-Marie Dubois` |
| Diacritics | `Zoë Nguyen` |
| Bare `@` prefix | `@James Chen` (unresolved mention) |

Fuzzy matching uses Damerau-Levenshtein (transpositions count as one edit) so common fast-typing errors are caught.

### Date forms
| Form | Example |
|---|---|
| Day + month name | `23 August`, `23rd August`, `August 23` |
| Abbreviated month | `23 Aug` |
| Australian numeric (day-first) | `23/8`, `23/08/26`, `23/08/2026` |
| ISO | `2026-08-23` |
| Weekday name | `Sunday`, `Sun` |
| Weekday with qualifier | `this Sunday`, `next Sunday`, `coming Friday` |
| Relative | `today`, `tomorrow`, `tmr`, `tmrw` |
| Weekday + calendar date | `Sunday 23 August` (weekday qualifies the date, triggers mismatch warning if wrong) |
| Multiple weekdays | `Monday and Wednesday` (produces multiple drafts) |

Bare weekday names anchor to the week currently visible on the roster grid (`viewedWeekStart`), so `Sunday` means the Sunday the manager is looking at.

### Time forms
| Form | Example |
|---|---|
| 12-hour with suffix | `10am`, `10 am`, `10AM`, `10:30am`, `10.30am` |
| 24-hour colon | `16:00` |
| Military (4-digit) | `1030`, `1730` |
| Named | `noon`, `midday`, `midnight` |
| Bare number (inferred) | `10` → flagged as ambiguous |

### Range forms
| Form | Example |
|---|---|
| Hyphen-glued | `10am-4pm` |
| Separator keyword | `10am to 4pm`, `10am till 4pm`, `10am until 4pm`, `10am thru 4pm` |
| En-dash | `10–4` |
| Midnight-crossing | `8pm-2am` (sets `endsNextDay: true`) |
| Open-ended | `10am to close`, `6pm till late` |
| Duration | `10am for 6 hours`, `10am 6hrs` |

Meridiem inference for ambiguous ranges (e.g. `10-4`) prefers the combination that yields a plausible shift length (1–14 hours), favouring same-day over midnight-crossing.

### Named shift presets
Resolved from the venue's saved preset config. Examples: `lunch`, `dinner`, `opening`, `closing`, `arvo`, `brekkie`, `tonight`. Presets only apply to start/end time — the manager still supplies a date.

### Sections
Matched against the venue's configured sections plus a synonym map: `FOH` → `floor`, `BOH` → `kitchen`, `barista` → `coffee`, `dishy` → `dish`, etc. Section tokens are consumed so they do not contaminate staff name matching.

### Filler words
Consumed silently: `for`, `on`, `at`, `please`, `pls`, `can you`, `the`, `a`, `shift`, `working`, and all verb tokens when they appear mid-sentence (e.g. `can you please roster James`).

### Word order
Any permutation is accepted. The parser is classification-based, not positional. `10am 23 Aug James Chen`, `James Chen 10am 23 Aug`, and `23 Aug James Chen 10am` all produce identical drafts.

---

## Deterministic Parser: Pass Order

Passes run in this fixed order. Each pass consumes tokens so later, looser passes cannot steal them. **The ordering is load-bearing.**

1. Verb and filler removal
2. Explicit dates (ISO, Australian numeric)
3. Time ranges (glued and separator forms)
4. Day-month calendar dates (`23 August`, `August 23`)
5. Relative and named dates (`today`, `next Sunday`, weekday names)
6. Daypart tokens (`tonight`, `arvo`, `closing`)
7. Duration (`for 6 hours`, `6hrs`)
8. Standalone times (bare numbers, last resort)
9. Section detection
10. Staff name extraction (everything remaining)

---

## Deterministic Parser: Key Behaviours

**Timezone safety.** The parser emits venue-local wall clock values only. UTC conversion happens server-side exactly once. The parser never calls any timezone API.

**Weekday cross-check.** When a weekday name accompanies a calendar date (`Sunday 25 August`), the parser resolves the calendar date and warns if the day of week does not match. This catches a common manager error.

**Meridiem inference.** When am/pm is absent, inference ranks candidate combinations by shift-length plausibility. All inferences set `am/pm was inferred` in `ambiguities` so the confirmation chip renders as needing a glance.

**Damerau-Levenshtein fuzzy matching.** Transpositions (adjacent character swaps from fast typing) count as one edit, not two. Tolerance scales with word length so short words do not collapse into each other.

**Multiple staff.** `and`, `,`, `&`, and `+` split the input into separate staff queries. Each staff member × each date produces one draft. A two-person, two-day input produces four drafts, all shown in the confirmation card.

**Chip validation.** A `@mention` chip carries a `staffId`, but it is validated against the venue's current staff list. A `staffId` absent from `venueStaff` is silently discarded, not trusted. Inactive staff are matched but flagged as archived in `ambiguities`.

**Recurrence is rejected.** Inputs containing `every`, `weekly`, `fortnightly`, `recurring`, etc. return a `ParseRejection` with a message redirecting the manager to the copy-week feature. Bounded multi-day inputs (`Monday and Wednesday`) are supported.

**`unconsumedTokens` is the LLM routing signal.** Any token the parser cannot classify ends up here. A non-empty `unconsumedTokens` array is the condition that routes to `LlmFallbackParser`. It is a deliberate escape hatch, not a fallback confidence guess.

---

## LLM Fallback Parser

Invoked only when `unconsumedTokens.length > 0`.

- Uses the Anthropic API with **function-calling / tool-use mode** — not a free-text prompt. The response schema is enforced by the API, not by hoping the model behaves.
- The venue's staff list is passed as the **only valid candidate set**. The model is instructed to pick from this list, never to invent a staffId.
- The model receives the raw input, the unconsumed tokens, and whatever partial data the deterministic parser already extracted.
- Output is the same `ParsedShiftDraft` shape with `source: 'nlp-fallback'` and `confidence` set conservatively.
- **The confirmation step is always shown** for LLM-sourced drafts, regardless of stated confidence.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| Tenant isolation | `venueId` and `managerId` are never parsed from text — stamped server-side from session context only |
| Cross-venue staff reference | Staff resolution only searches `venueStaff` for the current session's venue |
| Prompt injection | LLM context contains only the raw manager input and the validated staff list. Venue/staff names that were ever user-supplied are sanitised before re-entering a prompt |
| Least privilege | The parse/resolve service runs with the managing user's own permissions — a manager scoped to one venue cannot roster staff at another |
| Chip tampering | Chip `staffId` values are validated against the live roster, not trusted at face value |
| Cost and abuse | LLM fallback calls are rate-limited per tenant with a cost cap |
| Audit trail | `rawInput` is persisted alongside the resulting shift record. Every confirmed shift records who typed what and who confirmed it |

---

## Confidence Grading

| Grade | Condition |
|---|---|
| `high` | Staff resolved, date present, start time present, no inferred meridiem, no unconsumed tokens |
| `medium` | Core fields present but meridiem inferred, end time missing, or minor ambiguity |
| `low` | Any core field missing, or unconsumed tokens remain |

The confirmation card always renders. For `high` confidence drafts the card is minimal (one-tap confirm). For `medium` or `low` it expands to show ambiguities and prompt the manager to review.

---

## Phased Build Plan

### Phase 1 — Deterministic parser + confirmation UI
- Implement `DeterministicNlpParser` client-side in TypeScript
- Build the `/` command palette and chip-based input component
- Build the confirmation card component
- Wire confirmed drafts into the existing `CreateShiftCommand` handler
- **No LLM dependency at this stage**

### Phase 2 — LLM fallback
- Implement `LlmFallbackParser` behind a feature flag
- Route inputs with non-empty `unconsumedTokens` to the fallback
- Add per-tenant rate limiting and cost cap

### Phase 3 — Expanded verb set
- `swap-shift`: higher blast radius, requires its own confirmation design
- `clear-day`: bulk action, requires an undo affordance
- `copy-last-week`: replaces the recurrence rejection with a real feature

---

## Files

| File | Purpose |
|---|---|
| `src/features/shift-command/types.ts` | Shared contracts: `ParsedShiftDraft`, `ParseContext`, `StaffSummary`, helpers |
| `src/features/shift-command/shift-command-parser.ts` | `DeterministicNlpParser` — all extraction passes |
| `src/features/shift-command/corpus.ts` | Input variation corpus (94 cases); doubles as the regression suite |
| `src/features/shift-command/run-tests.ts` | Test runner — `node --experimental-strip-types run-tests.ts` |
| `src/features/shift-command/CommandPalette.tsx` | Palette + chip input UI component |
| `src/features/shift-command/ConfirmationCard.tsx` | Draft review and confirm UI component |
| `src/features/shift-command/llm-fallback-parser.ts` | `LlmFallbackParser` (Phase 2) |