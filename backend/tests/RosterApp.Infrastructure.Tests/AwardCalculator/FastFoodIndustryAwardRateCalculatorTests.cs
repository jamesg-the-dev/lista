using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Staffing;
using RosterApp.Infrastructure.AwardCalculator;

namespace RosterApp.Infrastructure.Tests.AwardCalculator;

/// <summary>
/// Worked examples sourced from MA000003 Table 6 (clause 20.6/21) and
/// Note 1 under it — see FastFoodIndustryAwardRateCalculator's doc comment
/// for the full citations. Base rate is a round $20.00/hr so expected
/// figures are easy to verify by hand.
/// </summary>
public class FastFoodIndustryAwardRateCalculatorTests
{
    private const decimal BaseRate = 20.00m;

    private static readonly AwardCalculationRates Rates = new(
        CasualLoadingPercent: 25.00m,
        PenaltyMultipliers: new Dictionary<PenaltyType, decimal>
        {
            [PenaltyType.Saturday] = 1.25m,
            [PenaltyType.Sunday] = 1.50m, // Level 2-3 figure — see class "KNOWN APPROXIMATION"
            [PenaltyType.EveningAfter7pm] = 1.10m, // Mon-Fri 10pm-midnight
            [PenaltyType.EarlyMorningBefore7am] = 1.15m, // Mon-Fri midnight-6am
        });

    private readonly FastFoodIndustryAwardRateCalculator _calculator = new();

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_FullTime_PaysBaseRate()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(20.00m, line.RatePerHour);
    }

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_Casual_AppliesClause11Point2bTwentyFivePercentLoading()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(25.00m, line.RatePerHour); // $20 x 1.25 — clause 11.2(b)
    }

    [Fact]
    public void Calculate_Saturday_FullTime_Pays125Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(25.00m, Assert.Single(lines).RatePerHour); // Table 6 — Saturday (any time) 125%
    }

    [Fact]
    public void Calculate_Saturday_Casual_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour); // Table 6 — Saturday casual 150% (125% + 25pts)
    }

    [Fact]
    public void Calculate_Sunday_FullTime_Pays150Percent_UsingLevel2To3Figure()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        // Table 6 Level 2-3 Sunday figure (150%) — see class doc comment
        // "KNOWN APPROXIMATION" re: Level 1's lower 125% not being modelled.
        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_Sunday_Casual_Pays175Percent_UsingLevel2To3Figure()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(35.00m, Assert.Single(lines).RatePerHour); // 150% + 25pts
    }

    [Fact]
    public void Calculate_WeekdayLateNightSplit_FullTime_SplitsOrdinaryAndLateNightPortions()
    {
        // 8pm-11pm: 2h ordinary (before 10pm) + 1h late-night (10pm-midnight).
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, new TimeOnly(20, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(2.00m, lines[0].Hours);
        Assert.Equal(20.00m, lines[0].RatePerHour); // ordinary
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(22.00m, lines[1].RatePerHour); // $20 x 1.10 — Table 6 Mon-Fri 10pm-midnight
    }

    [Fact]
    public void Calculate_WeekdayLateNightSplit_Casual_AppliesLoadingToBothPortions()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, new TimeOnly(20, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(25.00m, lines[0].RatePerHour); // ordinary: $20 x 1.25
        Assert.Equal(27.00m, lines[1].RatePerHour); // late night: $20 x (1.10 + 0.25)
    }

    [Fact]
    public void Calculate_EarlyMorningIntoOrdinarySplit_FullTime_SplitsBothPortions()
    {
        // 5am-7am: 1h early-morning (midnight-6am) + 1h ordinary (from 6am).
        var lines = _calculator.Calculate(
            DayOfWeek.Thursday, new TimeOnly(5, 0), new TimeOnly(7, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(1.00m, lines[0].Hours);
        Assert.Equal(23.00m, lines[0].RatePerHour); // $20 x 1.15 — Table 6 Mon-Fri midnight-6am
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(20.00m, lines[1].RatePerHour); // ordinary
    }

    [Fact]
    public void Calculate_ZeroOrNegativeDuration_ReturnsNoLines()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(9, 30), 30, BaseRate, EmploymentType.Casual, Rates);

        Assert.Empty(lines);
    }
}
