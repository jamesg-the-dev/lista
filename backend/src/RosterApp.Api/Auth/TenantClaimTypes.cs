namespace RosterApp.Api.Auth;

/// <summary>
/// Custom claim types added by SupabaseClaimsTransformation after looking
/// up the Supabase user's internal Manager record. Kept separate from
/// standard JWT claims (sub, email) so CurrentTenantContext can read them
/// without re-querying the database per request.
/// </summary>
public static class TenantClaimTypes
{
    public const string ManagerId = "roster:manager_id";
    public const string StaffMemberId = "roster:staff_member_id";
    public const string OrganisationId = "roster:organisation_id";
    public const string VenueId = "roster:venue_id"; // one claim instance per accessible venue — stamped for both managers and staff
}
