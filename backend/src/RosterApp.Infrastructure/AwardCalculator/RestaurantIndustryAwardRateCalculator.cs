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
///   - Public holiday: reconfirmed against the FWO's official Pay Guide for
///     MA000119 (Award Code: MA000119, Effective 01/07/2026, Published
///     24/06/2026, portal.fairwork.gov.au) — Introductory level: ordinary
///     $25.74/hr, public holiday $57.92/hr (225%, permanent); casual
///     ordinary $32.18/hr, casual public holiday $64.35/hr (200% of the
///     casual rate = 250% of the permanent base, +25 points). Matches
///     Table 8's 225%/250% figures already cited above.
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
/// Night differential (2026-08-25 fix): Table 8's Mon-Fri 10pm-midnight and
/// midnight-6am rows are a FLAT DOLLAR addition — reconfirmed against the
/// FWO Pay Guide above as "base rate plus $2.95/hour" (10pm-midnight) and
/// "base rate plus $4.42/hour" (midnight-6am) at the 01/07/2026 rates
/// (superseding the earlier, now-stale "$2.62"/"$3.93" citation from a
/// prior wage-review period) — a structurally different figure type from
/// every percentage multiplier this calculator (and PenaltyMultipliers)
/// models, which is why it's sourced from AwardCalculationRates.FlatDollarLoadings
/// (a separate dictionary from PenaltyMultipliers) and applied via
/// BuildFlatDollarLine (a separate helper from BuildLine) rather than
/// folded into the existing percentage-multiplier machinery — see
/// AwardCalculationRates' doc comment for why the two stay structurally
/// separate. The addition applies identically to casual and permanent
/// employees, sitting on top of whichever base rate (loaded or not)
/// already applies — confirmed against the Pay Guide's casual table
/// showing the same "plus $X/hour" figure on top of the already-loaded
/// casual hourly rate.
///
/// NOT implemented: public holiday penalty is now implemented (see above);
/// remains not implemented is any concept of a shift crossing midnight —
/// CreateShiftCommandValidator requires End &gt; Start on the same calendar
/// day, so a shift can hit at most the early-morning+ordinary or
/// ordinary+late-night window pair, never a genuine midnight wraparound
/// (same rationale as FastFoodIndustryAwardRateCalculator's three-window
/// split).
/// </summary>
public sealed class RestaurantIndustryAwardRateCalculator : IAwardRateCalculator
{
    private static readonly TimeSpan EarlyMorningEnd = new(6, 0, 0);
    private static readonly TimeSpan LateNightStart = new(22, 0, 0);
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
            // of day of week — its own column in Table 8, not a variant of
            // the Saturday/Sunday/night-differential rate.
            return [BuildLine("Public holiday", rates.GetMultiplier(PenaltyType.PublicHoliday), isCasual, totalMinutes, baseRatePerHour, casualLoadingFraction)];
        }

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

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour, isCasual, rates, casualLoadingFraction);
    }

    /// <summary>
    /// Splits a weekday shift's paid minutes across MA000119's three
    /// Mon-Fri windows (midnight-6am, 6am-10pm, 10pm-midnight) in
    /// chronological order from the shift's start — same greedy
    /// clock-time-first-then-cap-to-remaining-paid-minutes approach as
    /// FastFoodIndustryAwardRateCalculator's three-window split, except the
    /// two night windows here are flat-dollar (BuildFlatDollarLine), not
    /// percentage multipliers (BuildLine). A shift can't cross midnight
    /// (CreateShiftCommandValidator requires End &gt; Start on the same
    /// calendar day), so at most the early-morning and ordinary windows, or
    /// ordinary and late-night windows, are ever both hit by one shift —
    /// never all three plus a wraparound.
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
            ("Early morning (midnight-6am)", TimeSpan.Zero, EarlyMorningEnd, PenaltyType.EarlyMorningBefore7am),
            ("Ordinary hours", EarlyMorningEnd, LateNightStart, null),
            ("Late night (10pm-midnight)", LateNightStart, EndOfDay, PenaltyType.EveningAfter7pm),
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

    /// <summary>
    /// Structurally distinct from BuildLine: the loading here is a flat
    /// $/hour addition on top of whichever base rate already applies
    /// (casual-loaded or not), never a multiplier applied to it — see
    /// class doc comment "Night differential" and
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
