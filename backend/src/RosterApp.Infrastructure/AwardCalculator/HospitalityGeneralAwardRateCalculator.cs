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
///   - Public holiday: verified against the FWO's official Pay Guide for
///     MA000009 (Award Code: MA000009, Effective 01/07/2026, Published
///     24/06/2026, portal.fairwork.gov.au) — 225% (permanent) / 250%
///     (casual, +25 points), same additive pattern as Saturday/Sunday.
///     E.g. Level 1 food and beverage attendant: ordinary $26.44/hr,
///     public holiday $59.49/hr (225%); casual ordinary $33.05/hr, casual
///     public holiday $66.10/hr (200% of the casual rate = 250% of the
///     permanent base).
///
/// The casual loading percentage and every permanent penalty multiplier
/// below (1.50/1.25) are STRUCTURE labels only — the actual numbers
/// are supplied per-call via the `rates` parameter (AwardCalculationRates),
/// resolved by IAwardCalculationRateLookup from AwardCalculationRateVersion
/// for the shift's date. This is deliberate: which day/period maps to which
/// PenaltyType and how the loading stacks with it are legally-structural
/// facts about MA000009 that only change if the award itself is restructured,
/// so they stay hardcoded here; the percentages themselves change on the
/// annual wage review and are effective-dated data instead — see
/// docs/award-calculator-routing-fix.md for the full rationale.
///
/// Evening/night differential (2026-08-25 fix, see
/// docs/hospitality-night-differential-fix.md): the FWO Pay Guide shows
/// MA000009's "Evening - Monday to Friday - 7pm to midnight" and "Night
/// work - Monday to Friday - midnight to 7am" rows as FLAT DOLLAR
/// additions — "base rate plus $2.95/hour" and "base rate plus $4.42/hour"
/// respectively at the 01/07/2026 rates — not percentage multipliers. This
/// calculator previously modelled both as a single percentage multiplier
/// (EveningAfter7pm = 1.10) applied to a single post-7pm window, which was
/// wrong on two counts: the wrong figure type (percentage vs flat dollar)
/// AND the wrong window structure (one evening window instead of separate
/// evening/night windows, since MA000009's night boundary is midnight-7am,
/// not the 10pm/6am boundaries MA000119 uses). Fixed to the same
/// three-window flat-dollar pattern as RestaurantIndustryAwardRateCalculator
/// — see that class's doc comment for why flat-dollar loadings are sourced
/// from AwardCalculationRates.FlatDollarLoadings (a separate dictionary from
/// PenaltyMultipliers) and applied via BuildFlatDollarLine (a separate
/// helper from BuildLine) rather than folded into the percentage-multiplier
/// machinery. The addition applies identically to casual and permanent
/// employees, sitting on top of whichever base rate (loaded or not) already
/// applies — confirmed against the Pay Guide's casual table showing the
/// same "plus $X/hour" figure on top of the already-loaded casual hourly
/// rate.
///
/// NOT implemented: any concept of a shift crossing midnight —
/// CreateShiftCommandValidator requires End &gt; Start on the same calendar
/// day, so a shift can hit at most the early-morning+ordinary or
/// ordinary+evening window pair, never a genuine midnight wraparound (same
/// rationale as RestaurantIndustryAwardRateCalculator/
/// FastFoodIndustryAwardRateCalculator's three-window split).
/// </summary>
public sealed class HospitalityGeneralAwardRateCalculator : IAwardRateCalculator
{
    private static readonly TimeSpan EarlyMorningEnd = new(7, 0, 0);
    private static readonly TimeSpan EveningStart = new(19, 0, 0);
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
            // of day of week — it is its own column in Table 14, not a
            // variant of the Saturday/Sunday/evening rate, and a public
            // holiday can (rarely) fall on a weekend.
            return [BuildLine("Public holiday", rates.GetMultiplier(PenaltyType.PublicHoliday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Sunday)
        {
            return [BuildLine("Sunday", rates.GetMultiplier(PenaltyType.Sunday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday", rates.GetMultiplier(PenaltyType.Saturday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour, isCasual, rates, casualLoadingFraction);
    }

    /// <summary>
    /// Splits a weekday shift's paid minutes across MA000009's three Mon-Fri
    /// windows (midnight-7am, 7am-7pm, 7pm-midnight) in chronological order
    /// from the shift's start — same greedy clock-time-first-then-cap-to-
    /// remaining-paid-minutes approach as RestaurantIndustryAwardRateCalculator's
    /// three-window split, with both night windows flat-dollar
    /// (BuildFlatDollarLine), not percentage multipliers (BuildLine). A
    /// shift can't cross midnight (CreateShiftCommandValidator requires End
    /// &gt; Start on the same calendar day), so at most the early-morning and
    /// ordinary windows, or ordinary and evening windows, are ever both hit
    /// by one shift — never all three plus a wraparound.
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
        var windows = new (string Label, TimeSpan From, TimeSpan To, PenaltyType? FlatDollarType)[]
        {
            ("Night work (midnight-7am)", TimeSpan.Zero, EarlyMorningEnd, PenaltyType.EarlyMorningBefore7am),
            ("Ordinary hours", EarlyMorningEnd, EveningStart, null),
            ("Weekday evening (7pm-midnight)", EveningStart, EndOfDay, PenaltyType.EveningAfter7pm),
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
                lines.Add(
                    window.FlatDollarType is { } flatDollarType
                        ? BuildFlatDollarLine(window.Label, rates.GetFlatDollarLoading(flatDollarType), isCasual, minutesHere, baseRatePerHour, casualLoadingFraction)
                        : BuildLine(window.Label, 1.00m, isCasual, minutesHere, baseRatePerHour, casualLoadingFraction));
                remaining -= minutesHere;
            }
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

    /// <summary>
    /// Structurally distinct from BuildLine: the loading here is a flat
    /// $/hour addition on top of whichever base rate already applies
    /// (casual-loaded or not), never a multiplier applied to it — see class
    /// doc comment "Evening/night differential" and
    /// AwardCalculationRates.FlatDollarLoadings.
    /// </summary>
    private static AwardBreakdownLine BuildFlatDollarLine(
        string periodLabel,
        decimal flatDollarPerHour,
        bool isCasual,
        double minutes,
        decimal baseRatePerHour,
        decimal casualLoadingFraction
    )
    {
        var loadedBaseRate = isCasual ? baseRatePerHour * (1 + casualLoadingFraction) : baseRatePerHour;
        var ratePerHour = loadedBaseRate + flatDollarPerHour;
        var label = isCasual
            ? $"{periodLabel} (casual incl. {casualLoadingFraction * 100:0.#}% loading, +${flatDollarPerHour:0.00}/hr)"
            : $"{periodLabel} (+${flatDollarPerHour:0.00}/hr)";

        var hours = Math.Round((decimal)(minutes / 60.0), 2);
        return new AwardBreakdownLine(label, hours, ratePerHour, Math.Round(hours * ratePerHour, 2));
    }
}
