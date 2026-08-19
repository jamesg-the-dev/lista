namespace RosterApp.Application.Rostering;

/// <summary>
/// Abstraction over award interpretation logic. MVP ships a single hardcoded
/// implementation (HospitalityGeneralAwardCalculator) but downstream code
/// depends on this interface only, so a second award (or an EBA-specific
/// pay template) can be added later without touching command handlers.
/// </summary>
public interface IAwardRateCalculator
{
    ShiftRateResult Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour);
}

public sealed record ShiftRateResult(
    decimal PaidHours,
    decimal Multiplier,
    string RateLabel,
    decimal TotalCost);
