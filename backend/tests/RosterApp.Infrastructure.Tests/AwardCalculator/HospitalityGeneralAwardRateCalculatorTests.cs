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
            [PenaltyType.PublicHoliday] = 2.25m, // FWO Pay Guide (01/07/2026) — 225% permanent
        },
        FlatDollarLoadings: new Dictionary<PenaltyType, decimal>
        {
            [PenaltyType.EveningAfter7pm] = 2.95m, // Mon-Fri 7pm-midnight, FWO Pay Guide (01/07/2026)
            [PenaltyType.EarlyMorningBefore7am] = 4.42m, // Mon-Fri midnight-7am, FWO Pay Guide (01/07/2026)
        });

    private readonly HospitalityGeneralAwardRateCalculator _calculator = new();

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_FullTime_PaysBaseRate()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(20.00m, line.RatePerHour);
        Assert.Equal(6.00m, line.Hours);
        Assert.Equal(120.00m, line.Amount);
    }

    [Fact]
    public void Calculate_WeekdayOrdinaryHours_Casual_AppliesClause11Point1TwentyFivePercentLoading()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Tuesday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(25.00m, line.RatePerHour); // $20 x 1.25 (clause 11.1: 25% "for each hour worked")
        Assert.Equal(150.00m, line.Amount);
    }

    [Fact]
    public void Calculate_Saturday_FullTime_Pays125Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(25.00m, line.RatePerHour); // $20 x 1.25 — Table 14, permanent Saturday rate
    }

    [Fact]
    public void Calculate_Saturday_Casual_Pays150Percent_NotCompounded()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

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
            DayOfWeek.Sunday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(30.00m, line.RatePerHour); // $20 x 1.50 — Table 14, permanent Sunday rate
    }

    [Fact]
    public void Calculate_Sunday_Casual_Pays175Percent()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Sunday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(35.00m, line.RatePerHour); // $20 x 1.75 (1.50 + 0.25) — Table 14 casual Sunday figure
    }

    [Fact]
    public void Calculate_PublicHoliday_FullTime_Pays225Percent()
    {
        // FWO Pay Guide (MA000009, effective 01/07/2026): Level 1 food and
        // beverage attendant — ordinary $26.44/hr, public holiday
        // $59.49/hr = 225% of ordinary.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(45.00m, line.RatePerHour); // $20 x 2.25
    }

    [Fact]
    public void Calculate_PublicHoliday_Casual_Pays250Percent_NotCompounded()
    {
        // FWO Pay Guide: casual ordinary $33.05/hr, casual public holiday
        // $66.10/hr = 200% of the casual rate = 250% of the permanent base
        // (225% + 25 points, additive stacking — not 225% x 1.25).
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(50.00m, line.RatePerHour); // $20 x 2.50
    }

    [Fact]
    public void Calculate_PublicHoliday_OverridesDayOfWeekRouting_EvenOnASaturday()
    {
        // A public holiday can fall on a weekend (e.g. a substitute day) —
        // public holiday pricing must win over the Saturday rate, not blend
        // with it, since Table 14 treats them as separate columns.
        var lines = _calculator.Calculate(
            DayOfWeek.Saturday, true, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(45.00m, line.RatePerHour); // public holiday 225%, not Saturday's 125%
    }

    [Fact]
    public void Calculate_PartTime_TreatedSameAsFullTime_NoCasualLoading()
    {
        var fullTime = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.FullTime, Rates);
        var partTime = _calculator.Calculate(
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.PartTime, Rates);

        Assert.Equal(fullTime.Single().RatePerHour, partTime.Single().RatePerHour);
    }

    [Fact]
    public void Calculate_WeekdayEveningHours_FullTime_AddsFlatDollarLoading_NotAPercentage()
    {
        // FWO Pay Guide (MA000009, effective 01/07/2026): "Evening - Monday
        // to Friday - 7pm to midnight" = base rate plus $2.95/hour — a flat
        // dollar addition, not a multiplier (see class doc comment
        // "Evening/night differential").
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(19, 0), new TimeOnly(20, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(22.95m, line.RatePerHour); // $20.00 + $2.95, not $20 x a multiplier
    }

    [Fact]
    public void Calculate_WeekdayEveningHours_Casual_FlatLoadingSitsOnTopOfTheLoadedBaseRate()
    {
        // The flat $/hour addition applies identically to casual and
        // permanent employees — it sits on top of whichever base rate
        // (loaded or not) already applies, per the Pay Guide's casual table
        // showing the same "plus $2.95/hour" figure on top of the
        // already-loaded casual hourly rate.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(19, 0), new TimeOnly(20, 0), 0, BaseRate, EmploymentType.Casual, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(27.95m, line.RatePerHour); // ($20 x 1.25) + $2.95
    }

    [Fact]
    public void Calculate_WeekdayNightWorkHours_FullTime_AddsFlatDollarLoading()
    {
        // "Night work - Monday to Friday - midnight to 7am" = base rate
        // plus $4.42/hour.
        var lines = _calculator.Calculate(
            DayOfWeek.Thursday, false, new TimeOnly(2, 0), new TimeOnly(4, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        var line = Assert.Single(lines);
        Assert.Equal(24.42m, line.RatePerHour); // $20.00 + $4.42
        Assert.Equal(2.00m, line.Hours);
    }

    [Fact]
    public void Calculate_ShiftStraddlesEveningBoundary_FullTime_SplitsOrdinaryAndEveningPortions()
    {
        // 6pm-8pm straddles the 7pm boundary: 1h ordinary (before 7pm) + 1h
        // evening (7pm-midnight, flat dollar).
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, false, new TimeOnly(18, 0), new TimeOnly(20, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(1.00m, lines[0].Hours);
        Assert.Equal(20.00m, lines[0].RatePerHour); // ordinary
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(22.95m, lines[1].RatePerHour); // $20.00 + $2.95
    }

    [Fact]
    public void Calculate_ShiftStraddlesNightWorkIntoOrdinaryBoundary_FullTime_SplitsBothPortions()
    {
        // 6am-8am straddles the 7am boundary: 1h night work (midnight-7am,
        // flat dollar) + 1h ordinary (from 7am).
        var lines = _calculator.Calculate(
            DayOfWeek.Thursday, false, new TimeOnly(6, 0), new TimeOnly(8, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(2, lines.Count);
        Assert.Equal(1.00m, lines[0].Hours);
        Assert.Equal(24.42m, lines[0].RatePerHour); // $20.00 + $4.42
        Assert.Equal(1.00m, lines[1].Hours);
        Assert.Equal(20.00m, lines[1].RatePerHour); // ordinary
    }

    [Fact]
    public void Calculate_PublicHoliday_OverridesEveningDifferential()
    {
        // A shift starting at 7pm on a public holiday prices at the public
        // holiday rate for the whole shift, not the flat-dollar evening
        // addition — public holiday is a distinct Table 14 column, not
        // layered on top of the evening differential.
        var lines = _calculator.Calculate(
            DayOfWeek.Wednesday, true, new TimeOnly(19, 0), new TimeOnly(20, 0), 0, BaseRate, EmploymentType.FullTime, Rates);

        Assert.Equal(45.00m, Assert.Single(lines).RatePerHour); // $20 x 2.25, not $20 + $2.95
    }

    [Fact]
    public void Calculate_ZeroOrNegativeDuration_ReturnsNoLines()
    {
        var lines = _calculator.Calculate(
            DayOfWeek.Monday, false, new TimeOnly(9, 0), new TimeOnly(9, 30), 30, BaseRate, EmploymentType.Casual, Rates);

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
            DayOfWeek.Saturday, false, new TimeOnly(9, 0), new TimeOnly(15, 0), 0, BaseRate, EmploymentType.Casual, hypotheticalRates);

        var line = Assert.Single(lines);
        Assert.Equal(32.00m, line.RatePerHour); // $20 x (1.30 + 0.30)
    }
}
