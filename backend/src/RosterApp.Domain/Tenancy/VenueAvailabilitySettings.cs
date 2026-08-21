namespace RosterApp.Domain.Tenancy;

/// <summary>
/// RequiresApproval is declared first (rather than reading-order
/// Disabled/RequiresApproval/AutoApproved) so the enum's CLR default (the
/// first member) matches VenueConfiguration's HasDefaultValue(RequiresApproval)
/// — see PermissionLevel's doc comment for why this ordering avoids an EF
/// Core footgun where an explicit assignment matching the CLR default can
/// silently be replaced by the DB default on insert.
/// </summary>
public enum SelfServiceMode
{
    RequiresApproval,
    Disabled,
    AutoApproved,
}

/// <summary>
/// Owned value object on Venue, one per venue — see
/// FEATURE_SETTINGS_STAFF_ROLES.md §3/§5. Deliberately a plain in-place
/// mutable setting rather than temporally versioned like AwardConfiguration
/// or RoleAwardMapping: it's a workflow toggle (does self-service
/// availability need manager approval), not a compliance/pay figure where
/// past-dated recalculation matters. Same "simple owned value on the
/// aggregate" pattern as Venue.ForecastSalesTarget/TradingHours.
/// </summary>
public sealed record VenueAvailabilitySettings(SelfServiceMode SelfServiceMode, int AdvanceNoticeDays)
{
    public static VenueAvailabilitySettings CreateDefault() => new(SelfServiceMode.RequiresApproval, 7);
}
