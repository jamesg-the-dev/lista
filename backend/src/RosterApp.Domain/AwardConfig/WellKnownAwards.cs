namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Fixed ids for the four Modern Awards seeded as selectable reference data
/// (see AwardDefinition) — pulled out of
/// RosterApp.Infrastructure.AwardConfig.AwardReferenceDataSeed (which still
/// owns the rest of the seed data: classification names, base rates, etc.)
/// so that Application-layer code — e.g. a command handler defaulting an
/// unconfigured venue to Hospitality — can reference an award id without
/// taking a dependency on the Infrastructure project. Application must never
/// reference RosterApp.Infrastructure.
/// </summary>
public static class WellKnownAwards
{
    public static readonly Guid HospitalityGeneralAwardId = new("11111111-0000-0000-0000-000000000001");
    public static readonly Guid RestaurantIndustryAwardId = new("11111111-0000-0000-0000-000000000002");
    public static readonly Guid RegisteredClubsAwardId = new("11111111-0000-0000-0000-000000000003");
    public static readonly Guid FastFoodIndustryAwardId = new("11111111-0000-0000-0000-000000000004");
}
