namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// A flat per-hour dollar addition for a penalty period, owned by
/// AwardCalculationRateVersion — structurally distinct from
/// PenaltyMultiplier (a percentage) so a shared helper or future change
/// can't accidentally treat one as the other. Some awards (e.g. MA000119's
/// Mon-Fri late-night/early-morning loading, clause 24.2/Table 8) express a
/// penalty period as "100% plus $X per hour" in the primary source rather
/// than as a percentage multiplier — see RestaurantIndustryAwardRateCalculator's
/// doc comment for the calculator that consumes this.
/// </summary>
public sealed record FlatDollarLoading(PenaltyType PenaltyType, decimal DollarPerHour)
{
    public static FlatDollarLoading Create(PenaltyType type, decimal dollarPerHour) => new(type, dollarPerHour);
}
