using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Staffing;
using RosterApp.Infrastructure.AwardCalculator;

namespace RosterApp.Infrastructure.Tests.AwardCalculator;

/// <summary>
/// Worked examples double as documentation of *why* the figures are what
/// they are — see HospitalityGeneralAwardRateCalculator's doc comment and
/// docs/casual-loading-calculation.md for the primary-source citations
/// (MA000009 clause 11.1 casual loading, Table 14 / clause 29.2(b) penalty
/// rates) these tests are asserting against. Base rate is a round $20.00/hr
/// throughout so the expected dollar figures are easy to verify by hand.
/// Rates are passed in explicitly (matching AwardReferenceDataSeed's
/// current MA000009 figures) rather than resolved via
/// IAwardCalculationRateLookup — the calculator is a pure function of its
/// inputs and doesn't own a repository dependency.
/// </summary>
public class HospitalityGeneralAwardRateCalculatorTests
{
    private const decimal BaseRate = 20.00m;

    private static readonly AwardCalculationRates Rates = new(
        CasualLoadingPercent: 25.00m,
        PenaltyMultipliers: new Dictionary<PenaltyType, decimal>
        {
            [PenaltyType.Saturday] = 1.25m,
            [PenaltyType.Sunday] = 1.50m,
            [PenaltyType.EveningAfter7pm] = 1.10m,
        });

    private readonly HospitalityGeneralAwardRateCalculator _calculator = new();

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_FullTime_PaysBaseRate()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(20.00m, line.RatePerHour);
        Assert.Equal(6.00m, line.Hours);
        Assert.Equal(120.00m, line.Amount);
    }

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_Casual_AppliesClause11Point1TwentyFivePercentLoading()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(25.00m, line.RatePerHour); // $20 x 1.25 (clause 11.1: 25% "for each hour worked")
        Assert.Equal(150.00m, line.Amount);
    }

    [Fact]
    public void Calculate_Saturday_FullTime_Pays125Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(25.00m, line.RatePerHour); // $20 x 1.25 — Table 14, permanent Saturday rate
    }

    [Fact]
    public void Calculate_Saturday_Casual_Pays150Percent_NotCompounded()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        // Table 14's published casual Saturday figure is 150% (125% + 25
        // points), NOT 125% x 1.25 = 156.25%. A compounding implementation
        // would double-count the loading and overpay — this is the bug
        // this audit exists to prevent in the other direction (underpaying
        // by omitting the loading entirely, which is what shipped before
        // this fix: casual and full-time shifts produced identical pay).
        Assert.Equal(30.00m, line.RatePerHour); // $20 x 1.50
        Assert.NotEqual(31.25m, line.RatePerHour);
    }

    [Fact]
    public void Calculate_Sunday_FullTime_Pays150Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(30.00m, line.RatePerHour); // $20 x 1.50 — Table 14, permanent Sunday rate
    }

    [Fact]
    public void Calculate_Sunday_Casual_Pays175Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(35.00m, line.RatePerHour); // $20 x 1.75 (1.50 + 0.25) — Table 14 casual Sunday figure
    }

    [Fact]
    public void Calculate_PartTime_TreatedSameAsFullTime_NoCasualLoading()
    {
        var fullTime = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);
        var partTime = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.PartTime, Rates);

        Assert.Equal(fullTime.Single().RatePerHour, partTime.Single().RatePerHour);
    }

    [Fact]
    public void Calculate_WeekdayEveningSplit_Casual_AppliesLoadingToBothOrdinaryAndEveningPortions()
    {
        // 5pm-9pm spans the (unverified — see class doc comment) 7pm evening
        // boundary: 2h ordinary + 2h evening. Clause 11.1's "for each hour
        // worked" loading applies to both portions regardless of which
        // portion's permanent multiplier is award-verified.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, new TimeOnly(17, 0), new TimeOnly(21, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(25.00m, lines[0].RatePerHour); // ordinary: $20 x 1.25
        Assert.Equal(27.00m, lines[1].RatePerHour); // evening: $20 x (1.10 + 0.25)
    }

    [Fact]
    public void Calculate_ZeroOrNegativeDuration_ReturnsNoLines()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(9, 30), 30, BaseRate, EmploymentType.Casual, Rates);

        Assert.Empty(lines);
    }

    [Fact]
    public void Calculate_UsesSuppliedRates_NotHardcodedFigures()
    {
        // Proves the calculator is genuinely driven by the `rates`
        // parameter rather than a compile-time constant — a hypothetical
        // wage-review update (30% casual loading, 130% Saturday) prices
        // differently with no code change.
        var hypotheticalRates = new AwardCalculationRates(
            CasualLoadingPercent: 30.00m,
            PenaltyMultipliers: new Dictionary<PenaltyType, decimal> { [PenaltyType.Saturday] = 1.30m });

        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, hypotheticalRates);

        var line = Assert.Single(lines);
        Assert.Equal(32.00m, line.RatePerHour); // $20 x (1.30 + 0.30)
    }
}
