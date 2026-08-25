using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;
using RosterApp.Infrastructure.AwardConfig;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// MA000009 (Hospitality Industry General Award) only, MVP rule set.
///
/// Verified against the primary source (Fair Work Ombudsman's published
/// text of MA000009, awards.fairwork.gov.au/MA000009.html, cross-checked
/// against the Fair Work Commission's consolidated award PDF) as at
/// 2026-08-25:
///   - Clause 11.1: casual loading is 25% "for each hour worked ... in
///     addition to the ordinary hourly rate" — this is
///     AwardReferenceDataSeed.HospitalityGeneralCasualLoadingPercentMin,
///     the single source of truth for the figure so it can't drift from
///     the seeded reference data.
///   - Table 14 (clause 29.2(b)): Saturday 125% (permanent) / 150%
///     (casual); Sunday 150% (permanent) / 175% (casual). Both casual
///     figures equal permanent + 25 points, matching
///     CasualLoadingStackingMode.AdditivePercentagePoints — see that
///     enum's doc comment for the full citation and cross-check against
///     MA000003's explicit award Note confirming the same mode.
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

    private static readonly decimal CasualLoadingFraction =
        AwardReferenceDataSeed.HospitalityGeneralCasualLoadingPercentMin / 100m;

    public IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        EmploymentType employmentType
    )
    {
        var totalMinutes =
            (end.ToTimeSpan() - start.ToTimeSpan()).TotalMinutes - unpaidBreakMinutes;
        if (totalMinutes <= 0)
        {
            return [];
        }

        var isCasual = employmentType == EmploymentType.Casual;

        if (dayOfWeek == DayOfWeek.Sunday)
        {
            return [BuildLine("Sunday", 1.50m, isCasual, totalMinutes, baseRatePerHour)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday", 1.25m, isCasual, totalMinutes, baseRatePerHour)];
        }

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour, isCasual);
    }

    private static List<AwardBreakdownLine> BuildWeekdayLines(
        TimeOnly start,
        double totalMinutes,
        decimal baseRatePerHour,
        bool isCasual
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
                BuildLine("Ordinary hours", 1.00m, isCasual, ordinaryMinutes, baseRatePerHour)
            );
        }

        if (eveningMinutes > 0)
        {
            lines.Add(
                BuildLine("Weekday evening", 1.10m, isCasual, eveningMinutes, baseRatePerHour)
            );
        }

        return lines;
    }

    /// <summary>
    /// Applies CasualLoadingStackingMode.AdditivePercentagePoints:
    /// casualMultiplier = permanentMultiplier + 25 points, never
    /// permanentMultiplier * 1.25 (that would double-count against Table
    /// 14's published casual figures — see this class's doc comment).
    /// </summary>
    private static AwardBreakdownLine BuildLine(
        string periodLabel,
        decimal permanentMultiplier,
        bool isCasual,
        double minutes,
        decimal baseRatePerHour
    )
    {
        var multiplier = isCasual
            ? permanentMultiplier + CasualLoadingFraction
            : permanentMultiplier;
        var label =
            permanentMultiplier == 1.00m
                ? (isCasual ? $"{periodLabel} (casual, incl. 25% loading)" : periodLabel)
                : $"{periodLabel} (+{(permanentMultiplier - 1) * 100:0.#}%{(isCasual ? ", casual incl. 25% loading" : "")})";

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
