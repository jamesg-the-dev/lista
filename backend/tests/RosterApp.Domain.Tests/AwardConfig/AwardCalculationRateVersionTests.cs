using RosterApp.Domain.AwardConfig;

namespace RosterApp.Domain.Tests.AwardConfig;

/// <summary>
/// Proves the effective-dated resolution the hybrid award-calculator
/// architecture depends on: a shift worked before a rate change prices at
/// the old figures, one worked after prices at the new ones (see
/// docs/award-calculator-routing-fix.md). Uses synthetic percentages, not
/// real award figures — this test is about the date-selection mechanism,
/// not about asserting any award's actual legal minimums (those are covered
/// per-calculator in RosterApp.Infrastructure.Tests).
/// </summary>
public class AwardCalculationRateVersionTests
{
    private static readonly Guid AwardId = Guid.NewGuid();
    private static readonly DateTime OldVersionEffectiveFrom = new(2024, 7, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime NewVersionEffectiveFrom = new(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc);

    private static (AwardCalculationRateVersion Old, AwardCalculationRateVersion New) BuildVersions()
    {
        var oldVersion = AwardCalculationRateVersion.Create(
            Guid.NewGuid(), AwardId, OldVersionEffectiveFrom, casualLoadingPercent: 20.00m,
            [PenaltyMultiplier.Create(PenaltyType.Saturday, 1.20m)]);

        var newVersion = AwardCalculationRateVersion.Create(
            Guid.NewGuid(), AwardId, NewVersionEffectiveFrom, casualLoadingPercent: 25.00m,
            [PenaltyMultiplier.Create(PenaltyType.Saturday, 1.25m)]);

        return (oldVersion, newVersion);
    }

    [Fact]
    public void SelectEffectiveAsOf_DateBeforeRateChange_ReturnsOldVersion()
    {
        var (oldVersion, newVersion) = BuildVersions();

        var selected = AwardCalculationRateVersion.SelectEffectiveAsOf(
            [oldVersion, newVersion], new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(oldVersion.Id, selected.Id);
        Assert.Equal(20.00m, selected.CasualLoadingPercent);
    }

    [Fact]
    public void SelectEffectiveAsOf_DateOnOrAfterRateChange_ReturnsNewVersion()
    {
        var (oldVersion, newVersion) = BuildVersions();

        var selected = AwardCalculationRateVersion.SelectEffectiveAsOf(
            [oldVersion, newVersion], NewVersionEffectiveFrom);

        Assert.Equal(newVersion.Id, selected.Id);
        Assert.Equal(25.00m, selected.CasualLoadingPercent);
    }

    [Fact]
    public void SelectEffectiveAsOf_DatePredatesEveryVersion_FallsBackToEarliest()
    {
        var (oldVersion, newVersion) = BuildVersions();

        var selected = AwardCalculationRateVersion.SelectEffectiveAsOf(
            [oldVersion, newVersion], new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(oldVersion.Id, selected.Id);
    }

    [Fact]
    public void ToRates_MapsPenaltyMultipliersIntoDictionaryKeyedByPenaltyType()
    {
        var version = AwardCalculationRateVersion.Create(
            Guid.NewGuid(), AwardId, OldVersionEffectiveFrom, casualLoadingPercent: 25.00m,
            [PenaltyMultiplier.Create(PenaltyType.Saturday, 1.25m), PenaltyMultiplier.Create(PenaltyType.Sunday, 1.50m)]);

        var rates = version.ToRates();

        Assert.Equal(25.00m, rates.CasualLoadingPercent);
        Assert.Equal(1.25m, rates.GetMultiplier(PenaltyType.Saturday));
        Assert.Equal(1.50m, rates.GetMultiplier(PenaltyType.Sunday));
    }
}
