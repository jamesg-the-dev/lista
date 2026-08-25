using RosterApp.Application.Rostering;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// Fixes the routing bug: previously every command handler had a single
/// global IAwardRateCalculator injected (always
/// HospitalityGeneralAwardRateCalculator), so every venue was priced under
/// MA000009 regardless of its configured award. This factory resolves the
/// calculator per venue/shift instead — see docs/award-calculator-routing-fix.md.
/// </summary>
public sealed class AwardRateCalculatorFactory(
    HospitalityGeneralAwardRateCalculator hospitalityGeneral,
    FastFoodIndustryAwardRateCalculator fastFoodIndustry,
    RestaurantIndustryAwardRateCalculator restaurantIndustry
) : IAwardRateCalculatorFactory
{
    public IAwardRateCalculator GetCalculator(Guid? awardId)
    {
        var effectiveAwardId = awardId ?? WellKnownAwards.HospitalityGeneralAwardId;

        if (effectiveAwardId == WellKnownAwards.HospitalityGeneralAwardId)
        {
            return hospitalityGeneral;
        }

        if (effectiveAwardId == WellKnownAwards.FastFoodIndustryAwardId)
        {
            return fastFoodIndustry;
        }

        if (effectiveAwardId == WellKnownAwards.RestaurantIndustryAwardId)
        {
            return restaurantIndustry;
        }

        if (effectiveAwardId == WellKnownAwards.RegisteredClubsAwardId)
        {
            throw new NotSupportedException(
                "MA000058 (Registered and Licensed Clubs Award) has no verified IAwardRateCalculator — " +
                "its casual loading stacking mode could not be confirmed against primary source " +
                "(see CasualLoadingStackingMode.Unverified). This award must not be selectable in venue " +
                "Settings; reaching this exception means that guard was bypassed.");
        }

        throw new NotSupportedException($"No IAwardRateCalculator is registered for award '{effectiveAwardId}'.");
    }

    public bool IsSupported(Guid awardId) =>
        awardId == WellKnownAwards.HospitalityGeneralAwardId
        || awardId == WellKnownAwards.FastFoodIndustryAwardId
        || awardId == WellKnownAwards.RestaurantIndustryAwardId;
}
