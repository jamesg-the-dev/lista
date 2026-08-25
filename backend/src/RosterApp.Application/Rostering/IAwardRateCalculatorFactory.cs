namespace RosterApp.Application.Rostering;

/// <summary>
/// Resolves the IAwardRateCalculator for a venue's configured award — fixes
/// the routing bug where every venue was priced under MA000009 (Hospitality)
/// rules regardless of which award was actually selected in Settings. See
/// docs/award-calculator-routing-fix.md.
/// </summary>
public interface IAwardRateCalculatorFactory
{
    /// <summary>
    /// awardId is the venue's AwardConfiguration.AwardId
    /// (AwardConfigurationDto.AwardId via IAwardConfigurationLookup), or
    /// null if the venue has never configured an award — defaults to
    /// RosterApp.Domain.AwardConfig.WellKnownAwards.HospitalityGeneralAwardId
    /// in that case, preserving this app's pre-fix behaviour for
    /// unconfigured venues. Throws NotSupportedException if the award has no
    /// verified calculator (e.g. MA000058 — see
    /// RosterApp.Domain.AwardConfig.CasualLoadingStackingMode.Unverified) or
    /// isn't a recognised award id at all; callers should not be able to
    /// reach this award id in practice, since GetAvailableAwardsQuery and
    /// UpdateAwardConfigurationCommandValidator both reject unsupported
    /// awards via IsSupported below — this is a defense-in-depth guard, not
    /// the primary gate.
    /// </summary>
    IAwardRateCalculator GetCalculator(Guid? awardId);

    /// <summary>Whether an award has a verified IAwardRateCalculator behind it — used to keep an unverified award (or one with no calculator at all) out of the Settings award dropdown and out of UpdateAwardConfigurationCommand.</summary>
    bool IsSupported(Guid awardId);
}
