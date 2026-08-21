namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// One venue's on/off choice for a penalty type — e.g. a venue that never
/// trades Sundays can leave Sunday disabled. Distinct from
/// AwardRate.PenaltyMultiplier (the award-mandated rate itself, reference
/// data); toggling this off doesn't change what the award requires, it just
/// tells the labour cost dashboard/payroll export this venue doesn't apply
/// it — see FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §6, which treats "zero
/// enabled penalties despite weekend trade" as a soft warning, not a block.
/// </summary>
public sealed record PenaltyRateToggle(PenaltyType PenaltyType, bool IsEnabled)
{
    public static PenaltyRateToggle Create(PenaltyType type, bool enabled) => new(type, enabled);
}
