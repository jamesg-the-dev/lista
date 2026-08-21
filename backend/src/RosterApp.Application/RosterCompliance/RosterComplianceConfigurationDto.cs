using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

public sealed record MealBreakRuleDto(decimal AfterHoursWorked, int BreakDurationMinutes, bool IsPaid)
{
    public static MealBreakRuleDto FromDomain(MealBreakRule rule) => new(rule.AfterHoursWorked, rule.BreakDurationMinutes, rule.IsPaid);
}

public sealed record MinorRosterRuleDto(decimal MaxDailyHours, decimal MaxWeeklyHours, TimeOnly EarliestStartTime, TimeOnly LatestFinishTime)
{
    public static MinorRosterRuleDto FromDomain(MinorRosterRule rule) =>
        new(rule.MaxDailyHours, rule.MaxWeeklyHours, rule.EarliestStartTime, rule.LatestFinishTime);
}

public sealed record RosterComplianceConfigurationDto(
    Guid Id,
    Guid VenueId,
    DateTime EffectiveFromUtc,
    DateTime? EffectiveToUtc,
    int MinShiftLengthMinutes,
    int MaxShiftLengthMinutes,
    int MinRestBetweenShiftsMinutes,
    int WeeklyOvertimeThresholdMinutes,
    MinorRosterRuleDto MinorRules,
    IReadOnlyList<MealBreakRuleDto> MealBreakRules,
    Guid CreatedByManagerId,
    DateTime CreatedAtUtc)
{
    public static RosterComplianceConfigurationDto FromDomain(RosterComplianceConfiguration config) =>
        new(
            config.Id,
            config.VenueId,
            config.EffectiveFromUtc,
            config.EffectiveToUtc,
            config.MinShiftLengthMinutes,
            config.MaxShiftLengthMinutes,
            config.MinRestBetweenShiftsMinutes,
            config.WeeklyOvertimeThresholdMinutes,
            MinorRosterRuleDto.FromDomain(config.MinorRules),
            config.MealBreakRules.Select(MealBreakRuleDto.FromDomain).ToList(),
            config.CreatedByManagerId,
            config.CreatedAtUtc);
}
