using RosterApp.Application.Rostering;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// MA000003 (Fast Food Industry Award 2020), MVP rule set.
///
/// Verified against the primary source (Fair Work Ombudsman's published
/// text of MA000003, awards.fairwork.gov.au/MA000003.html) as at
/// 2026-08-25:
///   - Clause 11.2(b): casual loading is "25% of the minimum hourly rate".
///   - Table 6 (clause 20.6/21), full-time/part-time -&gt; casual:
///     Mon-Fri 6am-10pm (ordinary) 100% -&gt; 125%; Mon-Fri 10pm-midnight
///     110% -&gt; 135%; Mon-Fri midnight-6am 115% -&gt; 140%; Saturday (any
///     time) 125% -&gt; 150%; Public holiday (any time) 225% -&gt; 250%.
///     Every casual figure equals the permanent figure + 25 points, per
///     Note 1 under Table 6: "The penalty rates for casual employees have
///     been calculated by adding the casual loading specified in clause
///     11.2(b) to the penalty rates for full-time and part-time
///     employees" — confirming
///     CasualLoadingStackingMode.AdditivePercentagePoints (already
///     recorded in that enum's doc comment from the prior casual-loading
///     audit).
///   - Public holiday: reconfirmed against the FWO's official Pay Guide
///     for MA000003 (Award Code: MA000003, Effective 01/07/2026, Published
///     24/06/2026, portal.fairwork.gov.au) — Level 1: ordinary $27.81/hr,
///     public holiday $62.57/hr (225%, permanent); casual ordinary
///     $34.76/hr, casual public holiday $69.53/hr (200% of the casual
///     rate = 250% of the permanent base, +25 points). Matches Table 6's
///     225%/250% figures already cited above.
///
/// KNOWN APPROXIMATION — Sunday: Table 6 splits Sunday into "Level 1 (any
/// time)" 125% -&gt; 150% and "Level 2-3 (any time)" 150% -&gt; 175%.
/// IAwardRateCalculator.Calculate has no classification-level parameter
/// (Shift/StaffMember don't carry an AwardClassificationDefinition yet —
/// see AwardRate's doc comment), so this calculator cannot pick the correct
/// tier per employee. It always applies the Level 2-3 (higher) figures —
/// the safe direction for a Level 1 employee is being modelled at a richer
/// rate than the award strictly requires (an overpayment, not a compliance
/// risk), never the reverse. Flagged for human review: resolving this
/// precisely requires threading classification through Shift pricing, a
/// larger change than this fix's scope (see
/// docs/award-calculator-routing-fix.md).
///
/// </summary>
public sealed class FastFoodIndustryAwardRateCalculator : IAwardRateCalculator
{
    private static readonly TimeSpan EarlyMorningEnd = new(6, 0, 0);
    private static readonly TimeSpan EveningStart = new(22, 0, 0);
    private static readonly TimeSpan EndOfDay = new(24, 0, 0);

    public IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        bool isPublicHoliday,
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

        if (isPublicHoliday)
        {
            // Public holiday pricing applies to the whole shift regardless
            // of day of week — its own column in Table 6, not a variant of
            // the Saturday/Sunday/night rate.
            return [BuildLine("Public holiday", rates.GetMultiplier(PenaltyType.PublicHoliday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Sunday)
        {
            // Level 2-3 figures applied universally — see class doc comment "KNOWN APPROXIMATION".
            return [BuildLine("Sunday", rates.GetMultiplier(PenaltyType.Sunday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday", rates.GetMultiplier(PenaltyType.Saturday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour, isCasual, rates, casualLoadingFraction);
    }

    /// <summary>
    /// Splits a weekday shift's paid minutes across MA000003's three
    /// Mon-Fri windows (midnight-6am, 6am-10pm, 10pm-midnight) in
    /// chronological order from the shift's start — same greedy
    /// clock-time-first-then-cap-to-remaining-paid-minutes approach as
    /// HospitalityGeneralAwardRateCalculator's two-window split, generalised
    /// to three. A shift can't cross midnight (CreateShiftCommandValidator
    /// requires End &gt; Start on the same calendar day), so at most the
    /// early-morning and ordinary windows, or ordinary and late-night
    /// windows, are ever both hit by one shift — never all three plus a
    /// wraparound.
    /// </summary>
    private static List<AwardBreakdownLine> BuildWeekdayLines(
        TimeOnly start,
        double totalMinutes,
        decimal baseRatePerHour,
        bool isCasual,
        AwardCalculationRates rates,
        decimal casualLoadingFraction
    )
    {
        var windows = new (string Label, TimeSpan From, TimeSpan To, decimal PermanentMultiplier)[]
        {
            ("Early morning (midnight-6am)", TimeSpan.Zero, EarlyMorningEnd, rates.GetMultiplier(PenaltyType.EarlyMorningBefore7am)),
            ("Ordinary hours", EarlyMorningEnd, EveningStart, 1.00m),
            ("Late night (10pm-midnight)", EveningStart, EndOfDay, rates.GetMultiplier(PenaltyType.EveningAfter7pm)),
        };

        var startOfDay = start.ToTimeSpan();
        var remaining = totalMinutes;
        var lines = new List<AwardBreakdownLine>();

        foreach (var window in windows)
        {
            if (remaining <= 0 || window.To <= startOfDay)
            {
                continue;
            }

            var windowStart = startOfDay > window.From ? startOfDay : window.From;
            var capacity = (window.To - windowStart).TotalMinutes;
            var minutesHere = Math.Min(capacity, remaining);

            if (minutesHere > 0)
            {
                lines.Add(BuildLine(window.Label, window.PermanentMultiplier, isCasual, minutesHere, baseRatePerHour, casualLoadingFraction));
                remaining -= minutesHere;
            }
        }

        return lines;
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
        var label =
            permanentMultiplier == 1.00m
                ? (isCasual ? $"{periodLabel} (casual, incl. {casualLoadingFraction * 100:0.#}% loading)" : periodLabel)
                : $"{periodLabel} (+{(permanentMultiplier - 1) * 100:0.#}%{(isCasual ? $", casual incl. {casualLoadingFraction * 100:0.#}% loading" : "")})";

        var hours = Math.Round((decimal)(minutes / 60.0), 2);
        var ratePerHour = baseRatePerHour * multiplier;
        return new AwardBreakdownLine(label, hours, ratePerHour, Math.Round(hours * ratePerHour, 2));
    }
}
