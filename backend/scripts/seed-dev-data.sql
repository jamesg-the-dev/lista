-- Minimal dev seed data for a fresh database (after running migrations).
--
-- Creates one Organisation, one Manager linked to your Supabase Auth user
-- (so /api/account/me resolves), one Venue with a complete profile (Venue
-- now requires Abn/Address/Timezone at creation — see
-- backend/src/RosterApp.Domain/Tenancy/Venue.cs), and the ManagerVenueAccess
-- row that grants that manager access to that venue.
--
-- Run once against a freshly-migrated database. Re-running will insert a
-- second organisation/venue rather than erroring — this is a one-shot
-- bootstrap script, not an idempotent seed.

WITH new_org AS (
  INSERT INTO "Organisations" ("Id", "Name", "CreatedAtUtc")
  VALUES (gen_random_uuid(), 'Demo Hospitality Group', now())
  RETURNING "Id"
),
new_manager AS (
  INSERT INTO "Managers" ("Id", "OrganisationId", "SupabaseUserId", "Name", "Email", "CreatedAtUtc")
  SELECT
    gen_random_uuid(),
    org."Id",
    '1edfff73-9715-4bd9-9026-c8610144a3a9', -- Supabase Auth user id (JWT "sub")
    'James Guerra',
    'jamesguerra2008@gmail.com',
    now()
  FROM new_org org
  RETURNING "Id", "OrganisationId"
),
new_venue AS (
  INSERT INTO "Venues" (
    "Id", "OrganisationId", "Name", "Abn",
    "Address_Line1", "Address_Line2", "Address_Suburb", "Address_State", "Address_Postcode", "Address_Country",
    "Timezone", "IsActive", "CreatedAtUtc", "CreatedByManagerId", "ForecastSalesTarget"
  )
  SELECT
    gen_random_uuid(),
    mgr."OrganisationId",
    'The Public House',
    '51824753556', -- valid ABN checksum (ATO's own example ABN)
    '123 Chapel St',
    NULL,
    'Prahran',
    'VIC',
    '3181',
    'AU',
    'Australia/Melbourne',
    true,
    now(),
    mgr."Id",
    NULL
  FROM new_manager mgr
  RETURNING "Id"
)
INSERT INTO "ManagerVenueAccesses" ("ManagerId", "VenueId")
SELECT mgr."Id", venue."Id"
FROM new_manager mgr, new_venue venue;
