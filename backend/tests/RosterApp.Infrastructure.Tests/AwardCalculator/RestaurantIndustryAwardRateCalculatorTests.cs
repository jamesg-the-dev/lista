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
        });

    private readonly RestaurantIndustryAwardRateCalculator _calculator = new();

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_FullTime_PaysBaseRate()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(20.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_Casual_AppliesClause11Point1TwentyFivePercentLoading()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(25.00m, Assert.Single(lines).RatePerHour); // $20 x 1.25 — clause 11.1
    }

    [Fact]
    public void Calculate_WeekdayLateNightHours_FullTime_StillPricedAtOrdinaryRate_NightDifferentialNotImplemented()
    {
        // Documents the known gap: Table 8's Mon-Fri 10pm-midnight row is a
        // flat dollar addition ("100% plus $2.62 per hour"), not modelled
        // by this calculator (see class doc comment "NOT implemented") —
        // this shift is priced as plain ordinary hours, understating the
        // award minimum for this window.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, new TimeOnly(22, 0), new TimeOnly(23, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(20.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_Saturday_FullTime_Pays125Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(25.00m, Assert.Single(lines).RatePerHour); // Table 8 — Saturday 125%
    }

    [Fact]
    public void Calculate_Saturday_Casual_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour); // Table 8 — Saturday casual 150%
    }

    [Fact]
    public void Calculate_Sunday_FullTime_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(30.00m, Assert.Single(lines).RatePerHour); // Table 8 — Sunday 150%
    }

    [Fact]
    public void Calculate_Sunday_Casual_Pays175Percent_UsingLevel3To6Figure()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        // Table 8's Level 3-6 casual Sunday figure (175%) applied
        // universally — see class doc comment "KNOWN APPROXIMATION": the
        // Introductory-Level 2 column is actually 150% (no extra loading),
        // which this calculator cannot distinguish without a classification
        // input, so it deliberately picks the higher (safer) figure.
        Assert.Equal(35.00m, Assert.Single(lines).RatePerHour);
    }

    [Fact]
    public void Calculate_ZeroOrNegativeDuration_ReturnsNoLines()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(9, 30), 30, BaseRate, EmploymentType.Casual, Rates);

        Assert.Empty(lines);
    }
}
