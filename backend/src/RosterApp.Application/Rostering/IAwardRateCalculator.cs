using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

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
    /// <summary>
    /// employmentType drives casual loading — see
    /// RosterApp.Domain.AwardConfig.CasualLoadingStackingMode for how a
    /// given award's implementation combines the loading with penalty
    /// rates. The caller resolves the shift's employee's EmploymentType
    /// (from StaffMember) and passes it in; the calculator stays a pure
    /// function with no repository dependency of its own.
    /// </summary>
    IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        EmploymentType employmentType
    );
}
