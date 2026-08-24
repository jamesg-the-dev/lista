# Feature: Venue Onboarding Flow

## Context
Modeled on Supabase's "Create Organization" → "Create Project" flow (see 
attached reference screenshots), adapted for Hospo Roster's venue-based model.
Two-step onboarding, but with different gating rules for each step.

## Step 1: Sign Up
- Email + password only (no additional fields at this stage).
- On successful auth, user is created but has no venue yet.

## Step 2: Create Venue (BLOCKING — mandatory gate)
- Immediately after signup, user sees a single form: **Venue Name** only.
- This is a hard gate:
  - No sidebar, no navigation, no other routes are reachable.
  - No "skip" option exists here.
  - User must submit a venue name before they can access anything else 
    in the app.
- On submit: create the Venue record, link the authenticated user to it 
  as the owner, then redirect into the app.
- Equivalent to Supabase's "Create a new organization" step, minus the 
  Type/Plan fields (not applicable to us) and minus the ability to cancel.

## Step 3: Venue Details (NON-BLOCKING — optional, skippable)
- After the venue is created, user lands on a "Complete Your Venue Profile" 
  form: address, state/region, timezone, and other venue metadata (final 
  field list TBD — pull from the Venue Profile settings spec if it exists).
- This step is NOT a gate:
  - Sidebar navigation is fully active — user can click away at any point.
  - A "Skip for now" button sits next to "Save", same row.
  - Skipping (or clicking away) drops the user straight into the app 
    with the venue in an "incomplete profile" state.
- The user should be able to return and complete this later — likely via 
  the venue settings page (Venue Profile section) rather than seeing this 
  form again on every login.

## Explicitly Out of Scope (for this feature)
- Freemium/subscription plan selection — no plan-gating logic yet. Do not 
  build placeholder plan UI; this will be a separate feature later.
- Multi-venue support per user (confirm: is this v1 single-venue-per-owner, 
  or do we need an org-switcher analog to Supabase's org dropdown?)

## Technical Notes
- Step 2 gate should be enforced via a route guard / redirect check 
  (e.g. "does the current user have a venue?") rather than purely a 
  frontend flag, since it needs to survive refresh and direct URL nav.
- Consider where "has venue but incomplete profile" is tracked — a bool/
  status field on the Venue entity, or inferred from null fields?
- Confirm redirect target after Step 3 skip/save (main dashboard? 
  roster view?).

## Open Questions Before Implementation
1. What's the full field list for Step 3 (venue details)?
2. Where does "incomplete profile" surface as a reminder later — banner, 
   settings badge, both, neither?
3. Single venue per user, or should the data model allow for multiple 
   later without a rewrite?

Note the onboarding steps can be removed now. This will require rolling back and deleting the properties and commands for onboarding. Can you do that for me? Once you've removed all those properties and commands/queries, you can also delete all migrations and create a new InitialCreate migration. I will handle dropping the database and running the migration.