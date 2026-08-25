using RosterApp.Application.Rostering;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// MA000119 (Restaurant Industry Award 2020), MVP rule set.
///
/// Verified against the primary source (Fair Work Commission's consolidated
/// MA000119 text, clause 24.2 and Table 8—Penalty rates) as at 2026-08-25:
///   - Clause 11.1: "An employer must pay a casual employee for each hour
///     worked a loading of 25% in addition to the minimum hourly rate".
///   - Table 8, Mon-Fri 6am-10pm (ordinary): full-time/part-time 100%,
///     casual 125% (both classification-level columns agree here).
///   - Table 8, Saturday: full-time/part-time 125%, casual 150% (both
///     classification-level columns agree here too — permanent + 25
///     points, matching CasualLoadingStackingMode.AdditivePercentagePoints).
///   - Table 8, Sunday: full-time/part-time 150%; casual "Introductory to
///     Level 2" 150% (no additional loading over the permanent rate on this
///     award's own published figures — an exception to additive stacking);
///     casual "Level 3 to Level 6" 175% (permanent + 25 points, the usual
///     additive pattern). This calculator derives casual Sunday pay via the
///     same additive formula as every other period (150% + 25 points =
///     175%), i.e. it applies the Level 3-6 figure universally — see KNOWN
///     APPROXIMATION below.
///   - Table 8, public holiday: full-time/part-time 225%, casual 250%
///     (both columns agree) — cited for completeness, not applied (see NOT
///     IMPLEMENTED below).
///
/// KNOWN APPROXIMATION — Sunday casual: unlike MA000009/MA000003, MA000119's
/// own Table 8 does NOT apply a uniform +25-point loading to every casual
/// classification on a Sunday — "Introductory to Level 2" casuals get 150%
/// (identical to the permanent rate), while "Level 3 to Level 6" casuals get
/// 175%. IAwardRateCalculator.Calculate has no classification-level input
/// (see AwardRate's doc comment — Shift/StaffMember don't carry
/// AwardClassificationDefinition yet), so this calculator cannot pick the
/// correct column per employee, and always produces the Level 3-6 figure
/// (175%). The safe direction for an Introductory/Level 1/Level 2 casual is
/// being modelled at a richer Sunday rate than Table 8 strictly requires for
/// them (an overpayment, not a compliance risk), never the reverse. Flagged
/// for human review: resolving this precisely requires threading
/// classification through Shift pricing (see
/// docs/award-calculator-routing-fix.md).
///
/// NOT implemented:
///   - Night differential. Table 8's Mon-Fri 10pm-midnight and
///     midnight-6am rows are a FLAT DOLLAR addition ("100% plus $2.62 per
///     hour" / "100% plus $3.93 per hour" at time of citation), not a
///     percentage multiplier — a structurally different figure type from
///     every other multiplier this calculator (and AwardCalculationRates)
///     models. Hours in these windows are currently priced at the ordinary
///     weekday rate (100%/125%), which understates the award minimum for
///     those hours. Flagged for human review rather than guessed at.
///   - Public holiday penalty. Calculate has no "is this shift on a public
///     holiday" input at all (same pre-existing interface gap
///     HospitalityGeneralAwardRateCalculator has).
/// </summary>
public sealed class RestaurantIndustryAwardRateCalculator : IAwardRateCalculator
{
    public IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        EmploymentType employmentType,
        AwardCalculationRates rates
    )
    {
        var totalMinutes =
            (end.ToTimeSpan() - start.ToTimeSpan()).TotalMinutes - unpaidBreakMinutes;
        if (totalMinutes <= 0)
        {
            return [];
        }

        var isCasual = employmentType == EmploymentType.Casual;
        var casualLoadingFraction = rates.CasualLoadingPercent / 100m;

        if (dayOfWeek == DayOfWeek.Sunday)
        {
            // Level 3-6 figure (175%) applied universally — see class doc
            // comment "KNOWN APPROXIMATION". Produced via the same additive
            // formula as every other period (150% + 25 points), which
            // happens to equal Table 8's Level 3-6 column exactly.
            return [BuildLine("Sunday", rates.GetMultiplier(PenaltyType.Sunday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday", rates.GetMultiplier(PenaltyType.Saturday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        // Weekday: night differential not modelled — see class doc comment "NOT implemented".
        return [BuildLine("Ordinary hours", 1.00m, isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
    }

    /// <summary>Applies CasualLoadingStackingMode.AdditivePercentagePoints — see class doc comment.</summary>
    private static AwardBreakdownLine BuildLine(
        string periodLabel,
        decimal permanentMultiplier,
        bool isCasual,
        double minutes,
        decimal baseRatePerHour,
        decimal casualLoadingFraction
    )
    {
        var multiplier = isCasual ? permanentMultiplier + casualLoadingFraction : permanentMultiplier;
        var label = isCasual ? $"{periodLabel} (casual incl. {casualLoadingFraction * 100:0.#}% loading)" : periodLabel;

        var hours = Math.Round((decimal)(minutes / 60.0), 2);
        var ratePerHour = baseRatePerHour * multiplier;
        return new AwardBreakdownLine(label, hours, ratePerHour, Math.Round(hours * ratePerHour, 2));
    }
}
