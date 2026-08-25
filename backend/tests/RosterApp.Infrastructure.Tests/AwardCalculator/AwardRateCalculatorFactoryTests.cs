using RosterApp.Domain.AwardConfig;
using RosterApp.Infrastructure.AwardCalculator;

namespace RosterApp.Infrastructure.Tests.AwardCalculator;

/// <summary>
/// Proves the routing fix: each venue's configured award resolves to its
/// own calculator instance rather than every venue silently falling
/// through to HospitalityGeneralAwardRateCalculator — see
/// docs/award-calculator-routing-fix.md.
/// </summary>
public class AwardRateCalculatorFactoryTests
{
    private readonly AwardRateCalculatorFactory _factory = new(
        new HospitalityGeneralAwardRateCalculator(),
        new FastFoodIndustryAwardRateCalculator(),
        new RestaurantIndustryAwardRateCalculator());

    [Fact]
    public void GetCalculator_HospitalityAwardId_ReturnsHospitalityCalculator()
    {
        var calculator = _factory.GetCalculator(WellKnownAwards.HospitalityGeneralAwardId);

        Assert.IsType<HospitalityGeneralAwardRateCalculator>(calculator);
    }

    [Fact]
    public void GetCalculator_FastFoodAwardId_ReturnsFastFoodCalculator()
    {
        var calculator = _factory.GetCalculator(WellKnownAwards.FastFoodIndustryAwardId);

        Assert.IsType<FastFoodIndustryAwardRateCalculator>(calculator);
    }

    [Fact]
    public void GetCalculator_RestaurantAwardId_ReturnsRestaurantCalculator()
    {
        var calculator = _factory.GetCalculator(WellKnownAwards.RestaurantIndustryAwardId);

        Assert.IsType<RestaurantIndustryAwardRateCalculator>(calculator);
    }

    [Fact]
    public void GetCalculator_NullAwardId_DefaultsToHospitality()
    {
        var calculator = _factory.GetCalculator(null);

        Assert.IsType<HospitalityGeneralAwardRateCalculator>(calculator);
    }

    [Fact]
    public void GetCalculator_RegisteredClubsAwardId_ThrowsNotSupported()
    {
        var ex = Assert.Throws<NotSupportedException>(() => _factory.GetCalculator(WellKnownAwards.RegisteredClubsAwardId));

        Assert.Contains("MA000058", ex.Message);
    }

    [Fact]
    public void GetCalculator_UnknownAwardId_ThrowsNotSupported()
    {
        Assert.Throws<NotSupportedException>(() => _factory.GetCalculator(Guid.NewGuid()));
    }

    [Theory]
    [MemberData(nameof(SupportedAwardIds))]
    public void IsSupported_SupportedAwards_ReturnsTrue(Guid awardId)
    {
        Assert.True(_factory.IsSupported(awardId));
    }

    [Fact]
    public void IsSupported_RegisteredClubs_ReturnsFalse()
    {
        // Blocked from Settings selection until its casual loading stacking
        // mode is resolved against primary source — see
        // CasualLoadingStackingMode.Unverified.
        Assert.False(_factory.IsSupported(WellKnownAwards.RegisteredClubsAwardId));
    }

    public static IEnumerable<object[]> SupportedAwardIds =>
    [
        [WellKnownAwards.HospitalityGeneralAwardId],
        [WellKnownAwards.FastFoodIndustryAwardId],
        [WellKnownAwards.RestaurantIndustryAwardId],
    ];
}
