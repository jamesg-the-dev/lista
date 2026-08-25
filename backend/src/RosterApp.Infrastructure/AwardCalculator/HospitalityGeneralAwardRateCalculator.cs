using RosterApp.Application.Rostering;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// MA000009 (Hospitality Industry General Award) only, MVP rule set.
///
/// Verified against the primary source (Fair Work Ombudsman's published
/// text of MA000009, awards.fairwork.gov.au/MA000009.html, cross-checked
/// against the Fair Work Commission's consolidated award PDF) as at
/// 2026-08-25:
///   - Clause 11.1: casual loading is 25% "for each hour worked ... in
///     addition to the ordinary hourly rate".
///   - Table 14 (clause 29.2(b)): Saturday 125% (permanent) / 150%
///     (casual); Sunday 150% (permanent) / 175% (casual). Both casual
///     figures equal permanent + 25 points, matching
///     CasualLoadingStackingMode.AdditivePercentagePoints — see that
///     enum's doc comment for the full citation and cross-check against
///     MA000003's explicit award Note confirming the same mode.
///
/// The casual loading percentage and every permanent penalty multiplier
/// below (1.50/1.25/1.10) are STRUCTURE labels only — the actual numbers
/// are supplied per-call via the `rates` parameter (AwardCalculationRates),
/// resolved by IAwardCalculationRateLookup from AwardCalculationRateVersion
/// for the shift's date. This is deliberate: which day/period maps to which
/// PenaltyType and how the loading stacks with it are legally-structural
/// facts about MA000009 that only change if the award itself is restructured,
/// so they stay hardcoded here; the percentages themselves change on the
/// annual wage review and are effective-dated data instead — see
/// docs/award-calculator-routing-fix.md for the full rationale.
///
/// NOT verified against Table 14 (still illustrative-only, same
/// disclaimer as before this audit — see CLAUDE.md § Award compliance):
/// weekday evening (after 7pm) and early-morning multipliers, and public
/// holiday. Casual loading is still applied to these using the same
/// AdditivePercentagePoints formula (clause 11.1's "for each hour worked"
/// applies regardless of period), so a casual employee is never left with
/// zero loading on an unverified period — but the *permanent* multiplier
/// for those periods, and therefore the resulting casual total, has not
/// been confirmed against Table 14 and must not be treated as sourced
/// payroll data until it is.
/// </summary>
public sealed class HospitalityGeneralAwardRateCalculator : IAwardRateCalculator
{
    private static readonly TimeSpan EveningBoundary = new(19, 0, 0);

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
            return [BuildLine("Sunday", rates.GetMultiplier(PenaltyType.Sunday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday", rates.GetMultiplier(PenaltyType.Saturday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour, isCasual, rates.GetMultiplier(PenaltyType.EveningAfter7pm), casualLoadingFraction);
    }

    private static List<AwardBreakdownLine> BuildWeekdayLines(
        TimeOnly start,
        double totalMinutes,
        decimal baseRatePerHour,
        bool isCasual,
        decimal eveningMultiplier,
        decimal casualLoadingFraction
    )
    {
        var startOfDay = start.ToTimeSpan();

        double ordinaryMinutes;
        double eveningMinutes;

        if (startOfDay >= EveningBoundary)
        {
            ordinaryMinutes = 0;
            eveningMinutes = totalMinutes;
        }
        else
        {
            var minutesBeforeEvening = (EveningBoundary - startOfDay).TotalMinutes;
            ordinaryMinutes = Math.Min(minutesBeforeEvening, totalMinutes);
            eveningMinutes = totalMinutes - ordinaryMinutes;
        }

        var lines = new List<AwardBreakdownLine>();
        if (ordinaryMinutes > 0)
        {
            lines.Add(
                BuildLine("Ordinary hours", 1.00m, isCasual, ordinaryMinutes, baseRatePerHour, casualLoadingFraction)
            );
        }

        if (eveningMinutes > 0)
        {
            lines.Add(
                BuildLine("Weekday evening", eveningMultiplier, isCasual, eveningMinutes, baseRatePerHour, casualLoadingFraction)
            );
        }

        return lines;
    }

    /// <summary>
    /// Applies CasualLoadingStackingMode.AdditivePercentagePoints:
    /// casualMultiplier = permanentMultiplier + casualLoadingFraction, never
    /// permanentMultiplier * (1 + casualLoadingFraction) (that would
    /// double-count against Table 14's published casual figures — see this
    /// class's doc comment).
    /// </summary>
    private static AwardBreakdownLine BuildLine(
        string periodLabel,
        decimal permanentMultiplier,
        bool isCasual,
        double minutes,
        decimal baseRatePerHour,
        decimal casualLoadingFraction
    )
    {
        var multiplier = isCasual
            ? permanentMultiplier + casualLoadingFraction
            : permanentMultiplier;
        var label =
            permanentMultiplier == 1.00m
                ? (isCasual ? $"{periodLabel} (casual, incl. {casualLoadingFraction * 100:0.#}% loading)" : periodLabel)
                : $"{periodLabel} (+{(permanentMultiplier - 1) * 100:0.#}%{(isCasual ? $", casual incl. {casualLoadingFraction * 100:0.#}% loading" : "")})";

        var hours = Math.Round((decimal)(minutes / 60.0), 2);
        var ratePerHour = baseRatePerHour * multiplier;
        return new AwardBreakdownLine(
            label,
            hours,
            ratePerHour,
            Math.Round(hours * ratePerHour, 2)
        );
    }
}
