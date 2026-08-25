namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Resolves whether a shift's date is a public holiday for award pay-penalty
/// purposes — the input IAwardRateCalculator.Calculate's isPublicHoliday
/// parameter needs, reusing the same system-maintained
/// RosterApp.Domain.RosterCompliance.PublicHoliday reference data that
/// already drives the Settings screen's calendar list
/// (GetPublicHolidaysQuery), not a second data source.
///
/// Deliberately keyed by venueId, not by state directly: a venue's
/// jurisdiction is Venue.Address.State, and Address is optional (null until
/// an owner completes the Venue Profile form) — see the implementation's
/// doc comment for how an unset Address is handled. This lookup, not the
/// calculator, owns that resolution so IAwardRateCalculator stays a pure
/// function of (shift inputs, EmploymentType, isPublicHoliday, rates) with
/// no venue/calendar dependency of its own.
///
/// Deliberately does NOT consult VenueHolidayOverride (the owner's
/// venue-specific closure days, e.g. a private event) — those are
/// business-chosen closures, not award-mandated public holidays, and
/// treating them as pay-penalty triggers would misrepresent what the award
/// actually requires. Only genuine PublicHoliday reference-data rows drive
/// this.
/// </summary>
public interface IPublicHolidayCalculationLookup
{
    Task<bool> IsPublicHolidayAsync(Guid venueId, DateOnly date, CancellationToken cancellationToken);
}
