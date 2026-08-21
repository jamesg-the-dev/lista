namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Shared between AwardRate.PenaltyMultipliers (system reference data — the
/// award-mandated multiplier) and AwardConfiguration.PenaltyToggles (the
/// venue's own on/off choice for each). A venue can disable a penalty it
/// doesn't need (e.g. no Sunday trade) without that affecting the reference
/// multiplier itself.
/// </summary>
public enum PenaltyType
{
    Saturday,
    Sunday,
    PublicHoliday,
    EveningAfter7pm,
    EarlyMorningBefore7am,
}
