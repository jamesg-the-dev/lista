using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Staffing;
using RosterApp.Infrastructure.AwardCalculator;

namespace RosterApp.Infrastructure.Tests.AwardCalculator;

/// <summary>
/// Worked examples sourced from MA000119 clause 24.2 and Table 8—Penalty
/// rates — see RestaurantIndustryAwardRateCalculator's doc comment for the
/// full citations. Base rate is a round $20.00/hr so expected figures are
/// easy to verify by hand.
/// </summary>
public class RestaurantIndustryAwardRateCalculatorTests
{
    private const decimal BaseRate = 20.00m;

    private static readonly AwardCalculationRates Rates = new(
        CasualLoadingPercent: 25.00m,
        PenaltyMultipliers: new Dictionary<PenaltyType, decimal>
        {
            [PenaltyType.Saturday] = 1.25m,
            [PenaltyType.Sunday] = 1.50m, // FT/PT figure; casual derives to 175% (Level 3-6) — see class "KNOWN APPROXIMATION"
            [PenaltyType.PublicHoliday] = 2.25m, // FWO Pay Guide (01/07/2026) — 225% permanent
        },
        FlatDollarLoadings: new Dictionary<PenaltyType, decimal>
        {
            [PenaltyType.EveningAfter7pm] = 2.95m, // Mon-Fri 10pm-midnight, FWO Pay Guide (01/07/2026)
            [PenaltyType.EarlyMorningBefore7am] = 4.42m, // Mon-Fri midnight-6am, FWO Pay Guide (01/07/2026)
        });

    private readonly RestaurantIndustryAwardRateCalculator _calculator = new();

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_FullTime_PaysBaseRate()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(20.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_Casual_AppliesClause11Point1TwentyFivePercentLoading()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(25.00m, Assert.Single(lines).RatePerHour); // $20 x 1.25 — clause 11.1
    }

    [Fact]
    public void Calculate_WeekdayLateNightHours_FullTime_AddsFlatDollarLoading_NotAPercentage()
    {
        // FWO Pay Guide (MA000119, effective 01/07/2026): "Late night -
        // Monday to Friday - 10pm to midnight" = base rate plus $2.95/hour
        // — a flat dollar addition, not a multiplier (see class doc
        // comment "Night differential").
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(22, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(22.95m, line.RatePerHour); // $20.00 + $2.95, not $20 x a multiplier
    }

    [Fact]
    public void Calculate_WeekdayLateNightHours_Casual_FlatLoadingSitsOnTopOfTheLoadedBaseRate()
    {
        // The flat $/hour addition applies identically to casual and
        // permanent employees — it sits on top of whichever base rate
        // (loaded or not) already applies, per the Pay Guide's casual
        // table showing the same "plus $2.95/hour" figure on top of the
        // already-loaded casual hourly rate.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(22, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(27.95m, line.RatePerHour); // ($20 x 1.25) + $2.95
    }

    [Fact]
    public void Calculate_WeekdayEarlyMorningHours_FullTime_AddsFlatDollarLoading()
    {
        // "Early morning - Monday to Friday - midnight to 6am" = base rate
        // plus $4.42/hour.
        var lines = _calculator.Calculate(
            DayOfWeek.Thursday, false, new TimeOnly(2, 0), new TimeOnly(4, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(24.42m, line.RatePerHour); // $20.00 + $4.42
        Assert.Equal(2.00m, line.Hours);
    }

    [Fact]
    public void Calculate_ShiftStraddlesLateNightBoundary_FullTime_SplitsOrdinaryAndLateNightPortions()
    {
        // 9pm-11pm straddles the 10pm boundary: 1h ordinary (before 10pm) +
        // 1h late-night (10pm-midnight, flat dollar).
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(21, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(1.00m, lines[0].Hours);
        Assert.Equal(20.00m, lines[0].RatePerHour); // ordinary
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(22.95m, lines[1].RatePerHour); // $20.00 + $2.95
    }

    [Fact]
    public void Calculate_ShiftStraddlesEarlyMorningIntoOrdinaryBoundary_FullTime_SplitsBothPortions()
    {
        // 5am-7am straddles the 6am boundary: 1h early-morning
        // (midnight-6am, flat dollar) + 1h ordinary (from 6am).
        var lines = _calculator.Calculate(
            DayOfWeek.Thursday, false, new TimeOnly(5, 0), new TimeOnly(7, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(1.00m, lines[0].Hours);
        Assert.Equal(24.42m, lines[0].RatePerHour); // $20.00 + $4.42
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(20.00m, lines[1].RatePerHour); // ordinary
    }

    [Fact]
    public void Calculate_Saturday_FullTime_Pays125Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(25.00m, Assert.Single(lines).RatePerHour); // Table 8 — Saturday 125%
    }

    [Fact]
    public void Calculate_Saturday_Casual_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour); // Table 8 — Saturday casual 150%
    }

    [Fact]
    public void Calculate_Sunday_FullTime_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour); // Table 8 — Sunday 150%
    }

    [Fact]
    public void Calculate_Sunday_Casual_Pays175Percent_UsingLevel3To6Figure()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        // Table 8's Level 3-6 casual Sunday figure (175%) applied
        // universally — see class doc comment "KNOWN APPROXIMATION": the
        // Introductory-Level 2 column is actually 150% (no extra loading),
        // which this calculator cannot distinguish without a classification
        // input, so it deliberately picks the higher (safer) figure.
        Assert.Equal(35.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_PublicHoliday_FullTime_Pays225Percent()
    {
        // FWO Pay Guide (MA000119, effective 01/07/2026): Introductory
        // level — ordinary $25.74/hr, public holiday $57.92/hr = 225%.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(45.00m, Assert.Single(lines).RatePerHour); // $20 x 2.25
    }

    [Fact]
    public void Calculate_PublicHoliday_Casual_Pays250Percent_NotCompounded()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(50.00m, Assert.Single(lines).RatePerHour); // $20 x 2.50
    }

    [Fact]
    public void Calculate_PublicHoliday_OverridesNightDifferential()
    {
        // A shift starting at 10pm on a public holiday prices at the
        // public holiday rate for the whole shift, not the flat-dollar
        // late-night addition — public holiday is a distinct Table 8
        // column, not layered on top of the night differential.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(22, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(45.00m, Assert.Single(lines).RatePerHour); // $20 x 2.25, not $20 + $2.95
    }

    [Fact]
    public void Calculate_ZeroOrNegativeDuration_ReturnsNoLines()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Monday, false, new TimeOnly(9, 0), new TimeOnly(9, 30), 30, BaseRate, EmploymentType.Casual, Rates);

        Assert.Empty(lines);
    }
}
