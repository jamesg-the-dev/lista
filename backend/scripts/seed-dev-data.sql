-- Minimal dev seed data for a fresh database (after running migrations).
--
-- Creates one Organisation, one Owner-tier StaffMember linked to your
-- Supabase Auth user (so /api/account/me resolves), one Venue with a
-- complete profile (Address/Timezone are required at creation, Abn is
-- optional but seeded here for realism — see
-- backend/src/RosterApp.Domain/Tenancy/Venue.cs), and the
-- StaffMemberVenueAssignments row that grants that owner access to that
-- venue. There is no separate Manager identity — every authenticated actor
-- (Owner, Manager, Supervisor, Staff) is a StaffMember row, distinguished
-- only by PermissionLevel (see StaffMember.cs).
--
-- Run once against a freshly-migrated database. Re-running will insert a
-- second organisation/venue rather than erroring — this is a one-shot
-- bootstrap script, not an idempotent seed.

WITH new_org AS (
  INSERT INTO "Organisations" ("Id", "Name", "CreatedAtUtc")
  VALUES (gen_random_uuid(), 'Demo Hospitality Group', now())
  RETURNING "Id"
),
new_staff AS (
  INSERT INTO "StaffMembers" (
    "Id", "OrganisationId", "Name", "Email", "Phone",
    "EmploymentType", "Classification", "MaxWeeklyHours", "DateOfBirth",
    "PermissionLevel", "SupabaseUserId", "CreatedAtUtc"
  )
  SELECT
    gen_random_uuid(),
    org."Id",
    'James Guerra',
    'jamesguerra2008@gmail.com',
    '+61412345678',
    'FullTime',
    'Level5',
    38,
    '1985-06-15',
    'Owner',
    '1edfff73-9715-4bd9-9026-c8610144a3a9', -- Supabase Auth user id (JWT "sub")
    now()
  FROM new_org org
  RETURNING "Id", "OrganisationId"
),
new_venue AS (
  INSERT INTO "Venues" (
    "Id", "OrganisationId", "Name", "Abn",
    "Address_Line1", "Address_Line2", "Address_Suburb", "Address_State", "Address_Postcode", "Address_Country",
    "Timezone", "IsActive", "CreatedAtUtc", "CreatedByStaffMemberId", "ForecastSalesTarget"
  )
  SELECT
    gen_random_uuid(),
    staff."OrganisationId",
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
    staff."Id",
    NULL
  FROM new_staff staff
  RETURNING "Id"
)
INSERT INTO "StaffMemberVenueAssignments" ("StaffMemberId", "VenueId")
SELECT staff."Id", venue."Id"
FROM new_staff staff, new_venue venue;
