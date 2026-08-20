using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Abstraction over award interpretation logic. MVP ships a single
/// hardcoded implementation (HospitalityGeneralAwardRateCalculator,
/// MA000009 only) but downstream code depends on this interface only, so a
/// second award (or an EBA-specific pay template) can be added later
/// without touching command handlers. Always returns an itemised
/// breakdown, never a single total — see CLAUDE.md "Why it exists".
/// </summary>
public interface IAwardRateCalculator
{
    IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour);
}
