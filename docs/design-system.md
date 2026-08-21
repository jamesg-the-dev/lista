# Design System

## Direction

Not a generic SaaS dashboard. This is a working tool used standing up,
mid-shift, by someone who doesn't have time to parse a cluttered UI —
so it borrows from **kitchen/service industry visual language** (docket
tickets, register receipts, a shift board pinned in the back of house)
rather than default startup-dashboard aesthetics. Deliberately avoids the
cream+terracotta and near-black+neon-accent looks that are the current
default for this kind of tool.

## Color philosophy

Chrome is neutral; color is reserved for signal. Concretely: backgrounds,
surfaces, borders, body text, and buttons all use shadcn/ui's default
neutral (zero-chroma) palette, unmodified, in both the light theme
(`:root`, the default) and dark theme (`.dark` class). The only things
allowed to introduce a hue are elements that carry real information —

- **role identity** (kitchen/floor/bar/manager — a staff member's role tag
  needs to be scannable at a glance across a dense grid), and
- **budget state** — `--destructive` (over-budget, delete actions) and
  `--success` (on-budget) — the user needs to notice these without
  reading text.

Everything else — page background, panel backgrounds, borders, body text,
primary buttons, hover states — stays on the neutral scale. This is a
deliberate change from an earlier fully-custom dark palette (pine-ink
background, marigold accent) that predated shadcn/ui adoption; that
palette put color on decorative chrome (buttons, focus rings, "today"
highlights) as well as signal, which fights shadcn's own token model and
adds hues with no functional job. **Don't introduce a new color for a UI
element unless it's signaling one of the two things above** — reach for a
neutral token (`--foreground`, `--muted-foreground`, `--card`, etc.)
instead, even where a splash of color feels tempting for emphasis. If a
genuinely new signal need comes up (e.g. a third semantic state beyond
"over budget" / "role"), add a deliberate token for it here rather than
reusing role colors or `--destructive` for an unrelated meaning.

## Color tokens

The canonical source of truth is `frontend/app/app.css`. **Light is the
default theme**, set on bare `:root` using shadcn/ui's stock light
palette; dark is fully available via the `.dark` class combined with the
`@custom-variant dark (&:is(.dark *))` declared at the top of the file.
Every semantic color token in this table is registered in the `@theme
inline` block as a `--color-*` mapping, which is what makes it available
as a Tailwind utility class. Component code must reach for the Tailwind
utility (`bg-card`, `text-muted-foreground`, `border-border`, ...), never
reinvent local tokens or fall back to inline `style={{ color: 'var(--...)'
}}`. See § Inline styles vs Tailwind utilities below for the full rule —
this was previously two competing patterns in the codebase (Tailwind
utilities in most screens, raw `var(--name)` inline styles in others, e.g.
`RosterBuilder.tsx`/`route.tsx`) and has been consolidated onto Tailwind
utilities everywhere.

### Inline styles vs Tailwind utilities

Never use inline `style={{ }}` with `var(--token)` for colors,
backgrounds, or borders. Every semantic color token above is registered
in `@theme` (`frontend/app/app.css`) and must be used as a Tailwind
utility class instead (e.g. `bg-card`, `text-muted-foreground`,
`border-border`). This isn't just style preference — an inline style
value can't respond to Tailwind's `hover:`/`dark:`/responsive variants,
so reaching for `style={{ background: 'var(--card)' }}` silently breaks
those the moment someone tries to add one.

Inline `style={{ }}` is reserved for genuinely dynamic/computed values
that can't be expressed as a static class — a percentage width driven by
data, a pixel height computed from a chart value, a CSS gradient string
built at runtime. Even then, prefer merging any *static* color/border
classes on the same element into `className` and keeping `style` scoped
to only the computed property. If a value is one of a small, known set of
options (e.g. a status that's always one of 3–4 states), that's a lookup
table into Tailwind class names, not a lookup table into CSS values passed
through `style` — see `BudgetBar.tsx`'s `STATUS_STYLE` for the pattern.

| shadcn variable | `:root` (light) | `.dark` | Use |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page background |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Cards, panels, popovers |
| `--secondary` / `--muted` / `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Hover states, raised/secondary elements |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Form field backgrounds/borders |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | All borders/dividers |
| `--foreground` / `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary text |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary text |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Buttons — neutral, not branded |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | Text/icons on top of `--primary` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Focus rings |
| `--destructive` | `#D64545` | `#D64545` (same — ours, not shadcn's stock red) | Over-budget, destructive actions — crimson |
| `--destructive-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` (same) | Text/icons on top of `--destructive` |
| `--destructive-tint` | `#FBEAEA` | `#3A1E1E` | Pale/dark chip background for destructive state (e.g. over-budget delta) |
| `--success` | `#1F8A54` | `#7FBF9E` (ours; no shadcn stock equivalent) | On-budget state — green |
| `--success-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | Text/icons on top of `--success` |
| `--success-tint` | `#E3F5EC` | `#1B2E24` | Pale/dark chip background for success state (e.g. on-budget delta) |

`--destructive` and `--success` are the two chrome-adjacent tokens that
keep the same custom hex in **both** themes rather than shadcn's
per-theme default — they're functional signal colors, not part of the
neutral chrome scale, so they don't shift with light/dark. See Color
philosophy above for why they and role colors are the only exceptions.
Their `-tint` counterparts *do* differ between themes (pale in light,
dark in `.dark`) since they're chip backgrounds meant to sit quietly
behind the page, not a fixed signal color themselves.

Dark mode is opted into by adding the `.dark` class (typically on
`<html>`); until that class is present, `:root`'s light values apply.
Native form controls (scrollbars, etc.) follow the active theme
automatically via `color-scheme: light` / `color-scheme: dark` set on
`:root` / `.dark` respectively — no per-component override needed.

### Date and time pickers

Always use shadcn/ui's components for date and time entry — never a bare
`<input type="date">` / `<input type="time">` styled by hand with inline
`style={{ borderColor: ... }}` the way earlier code in this repo did.
Reasons: the native control's calendar/clock affordance isn't restyleable
and looks out of place next to shadcn chrome, and hand-styled native
inputs drift from the token set over time instead of picking up future
`ui/` restyles for free.

- **Time entry** (e.g. a shift's start/end time): wrap a
  `type="time"` `Input` in `InputGroup` from
  `frontend/src/components/ui/input-group.tsx`, with an `InputGroupAddon`
  clock icon (`ClockIcon` from `lucide-react`, matching the "Icon" suffix
  convention already used for icons in this codebase). Hide the native
  picker glyph so only the shadcn-styled affordance shows:
  `className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"`.
  See `ShiftEditorPanel` in `RosterBuilder.tsx` for the reference
  implementation (Start/End fields).
- **Date entry** (a single date, or a date range): compose `Popover` +
  `Calendar` + `Button` — install both `calendar` and `popover` from the
  shadcn registry (`npx shadcn@latest add calendar popover` from
  `frontend/`) the first time a screen needs one, matching the `base-mira`
  style already configured in `components.json`. No screen needs this yet
  (shift date on the roster builder is implied by its grid column, not a
  separately-editable field) — add it when one does, rather than
  installing it speculatively.
- Either way, install missing primitives via the shadcn CLI
  (`npx shadcn@latest add <name>`) rather than hand-rolling a Popover/
  Calendar/Input from scratch — that's what keeps `components/ui/` as
  genuine shadcn source per the Stack decisions in `CLAUDE.md`, restyled
  with our tokens rather than copied ad hoc.

### Role colors

Used consistently anywhere a staff member's role needs a visual tag (shift
chips, avatars, legends). Don't introduce new role colors ad hoc — extend
this table if a new role type is added.

| Role | Hex | Tint (background) |
|---|---|---|
| Kitchen | `#B85C2E` | `#3A2519` |
| Floor | `#4C9A8E` | `#173029` |
| Bar | `#C9A227` | `#332B0E` |
| Manager | `#7D8CC4` | `#232A42` |

Also defined as CSS variables (`--role-kitchen`, `--role-kitchen-tint`,
etc.) on `:root` in `frontend/src/index.css` — shared by both themes, not
re-specified in `.dark` — and exposed as Tailwind utilities
(`bg-role-kitchen`, `text-role-kitchen-tint`, ...) via the `@theme inline`
block, for screens that adopt utility classes instead of the inline-style
`ROLE_META` object `RosterBuilder.tsx` currently uses.

**Open flag (needs a design pass):** the tint values above were tuned as
dark chip/avatar backgrounds against the app's original dark-only page.
Now that light is the default theme, a near-black tint like
`--role-kitchen-tint` (`#3A2519`) sitting behind a role-colored letter on
an otherwise white card will likely read as a jarring floating badge
rather than a soft tag background. This was deliberately left unchanged
rather than guessed at — re-tune the tint ramp for light before shipping
the light theme for real use, most likely with a second, lighter tint
value per role for `:root` while keeping the current values in `.dark`.

## Typography

Single-font system — **Plus Jakarta Sans** (400/500/600/700) for
everything: headers, venue names, nav labels, uppercase tracked labels,
body text, staff names, form labels, buttons, and the numeric figures
(shift costs, the weekly total, the award rate breakdown panel). Chosen
for legibility at small sizes in a dense grid. There is no separate
display or mono face — hierarchy is carried by **weight and size**
instead of a typeface switch:

- Headers, eyebrow labels, nav labels, and uppercase tracked text use
  **semibold** (avatar/chip role letters use **bold**, since they're a
  single glyph that needs to read as a mark rather than a word).
- Body text, staff names, and form labels use **medium/regular** as
  before.
- Numeric figures that represent money, time, or a rate — shift costs,
  the weekly total, the award breakdown panel — use **medium weight**
  plus the `tabular-nums` utility (Tailwind's built-in
  `font-variant-numeric: tabular-nums`), so columns of numbers still
  align cleanly without needing a monospace typeface.

Loaded via `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap')`
at the top of `frontend/src/index.css`, globally — not per-component. It
used to live inside `RosterBuilder.tsx`'s inline `<style>` block; that was
a duplication bug (the font loaded once per screen that inlined it
instead of once for the app) and has been moved to `index.css` for real.

## Signature patterns

These aren't incidental styling choices — they carry product meaning and
should be reused, not reinvented per screen.

### Docket-ticket shift chips
Shift chips have a role-colored tab on the left (a letter — K/F/B/M) and
the time/cost on the right in tabular numerals. Modeled on a kitchen
order docket. Reuse this shape for any future shift-like unit (e.g. swap
requests).

### Receipt-style breakdown
The award-rate calculation panel (shift editor slide-over) shows its math
line by line — base rate, paid hours, penalty multiplier, total — styled
like a printed receipt. **This is the product's core differentiator**
(see `CLAUDE.md` — "why it exists"). Any screen that shows a cost figure
derived from a calculation should offer this same transparent breakdown,
not just the final number.

### Live cost strip
Running weekly total styled as a receipt tape, with a pulsing dot when the
figure is live/current, and a green/red delta against budget. Per-day mini
bar chart underneath for at-a-glance distribution across the week.

## Layout notes

- Tailwind core utilities (`flex`, `grid`, `gap-*`, `rounded-*`, `p-*`,
  `text-*` sizing) handle structure and spacing. Tailwind v4 (via
  `@tailwindcss/vite`) is fully JIT, so arbitrary values (`w-[220px]`,
  `text-[11px]`) are available — prefer a token/theme value first, and
  reach for an arbitrary value only when nothing in the theme fits.
- Custom CSS variables (see Color tokens above) handle color, since these
  fall outside Tailwind's default palette.
- Component primitives (button, dialog, dropdown, etc.) come from
  shadcn/ui on Base UI — see `CLAUDE.md` § Stack decisions for why, and
  `frontend/components.json` for the exact config (style: `base-mira`).
  Component source lives in `frontend/src/components/ui/`; restyle with
  the tokens above rather than shadcn's defaults.
- Light is the default theme (`:root`), dark is fully available via the
  `.dark` class and the `@custom-variant dark` in `index.css` — both are
  real token sets now, not a hypothetical. Don't add per-component
  light/dark overrides; extend the two blocks in `index.css` instead.

## Accessibility notes (carry forward, not yet audited)

- Role color alone is not sufficient signal — every role-colored element
  also has a text label or letter (chip tab shows K/F/B/M, not just color).
- Contrast of `--muted-foreground` (`oklch(0.708 0 0)`) on `--background`
  (`oklch(0.145 0 0)`) should be re-checked against WCAG AA before
  shipping — it's borderline for small text sizes.