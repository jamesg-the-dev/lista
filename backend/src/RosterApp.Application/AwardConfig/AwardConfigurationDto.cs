using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

public sealed record PenaltyRateToggleDto(string PenaltyType, bool IsEnabled)
{
    public static PenaltyRateToggleDto FromDomain(PenaltyRateToggle toggle) =>
        new(toggle.PenaltyType.ToString(), toggle.IsEnabled);
}

public sealed record AwardConfigurationDto(
    Guid Id,
    Guid VenueId,
    Guid AwardId,
    DateTime EffectiveFromUtc,
    DateTime? EffectiveToUtc,
    decimal CasualLoadingPercent,
    decimal SuperannuationRatePercent,
    decimal StatutoryMinimumSuperannuationPercent,
    bool MeetsSuperannuationMinimum,
    string PayPeriod,
    string PayPeriodCutoffDay,
    Guid CreatedByManagerId,
    DateTime CreatedAtUtc,
    IReadOnlyList<PenaltyRateToggleDto> PenaltyToggles)
{
    public static AwardConfigurationDto FromDomain(AwardConfiguration config) =>
        new(
            config.Id,
            config.VenueId,
            config.AwardId,
            config.EffectiveFromUtc,
            config.EffectiveToUtc,
            config.CasualLoadingPercent,
            config.SuperannuationRatePercent,
            SuperannuationGuarantee.CurrentStatutoryMinimumPercent,
            config.SuperannuationRatePercent >= SuperannuationGuarantee.CurrentStatutoryMinimumPercent,
            config.PayPeriod.ToString(),
            config.PayPeriodCutoffDay.ToString(),
            config.CreatedByManagerId,
            config.CreatedAtUtc,
            config.PenaltyToggles.Select(PenaltyRateToggleDto.FromDomain).ToList());
}
