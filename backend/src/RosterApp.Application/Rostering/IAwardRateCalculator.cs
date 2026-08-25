using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Abstraction over award interpretation logic. One implementation per
/// award (HospitalityGeneralAwardRateCalculator/FastFoodIndustryAwardRateCalculator/
/// RestaurantIndustryAwardRateCalculator — see IAwardRateCalculatorFactory
/// for how a venue's configured award resolves to the right instance) so a
/// further award (or an EBA-specific pay template) can be added later
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
    /// (from StaffMember) and passes it in.
    ///
    /// isPublicHoliday is resolved by the caller (see
    /// RosterApp.Application.AwardConfig.IPublicHolidayCalculationLookup)
    /// from the shift's venue and date — the calculator stays a pure
    /// function with no repository/date-calendar dependency of its own,
    /// same rationale as resolving EmploymentType outside the calculator.
    /// When true, it overrides the normal day-of-week routing for the
    /// whole shift: a public holiday is priced at the award's public
    /// holiday rate regardless of which day of the week it falls on (public
    /// holidays are occasionally observed on a weekend), never blended with
    /// the Saturday/Sunday/weekday-evening rate.
    ///
    /// rates carries the numeric casual-loading percentage, penalty
    /// multipliers, and flat-dollar loadings effective on the shift's date
    /// (see IAwardCalculationRateLookup) — the calculator itself stays a
    /// pure function with no repository dependency of its own, same as
    /// IRosterComplianceValidator. Calculation STRUCTURE (which day/period
    /// maps to which PenaltyType, how the loading stacks with a penalty
    /// multiplier or flat-dollar addition) is what's hardcoded per
    /// implementation; these numbers are not.
    /// </summary>
    IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        bool isPublicHoliday,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        EmploymentType employmentType,
        AwardCalculationRates rates
    );
}
