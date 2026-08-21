using RosterApp.Domain.ValueObjects;

namespace RosterApp.Domain.RosterCompliance;

/// <summary>
/// System-maintained reference data (§2 AC3, §6) — owners view this, they
/// don't author it. Seeded via an idempotent startup seeder (see
/// PublicHolidayReferenceDataSeed/PublicHolidayReferenceDataSeeder), same
/// "data change not a code deploy"
/// rationale as AwardDefinition. One row per state even for a nationally
/// observed date (IsNational = true) — matching the spec's schema — because
/// GetPublicHolidaysQuery filters by a single state and some nationally
/// observed dates are substituted differently per state.
/// </summary>
public sealed class PublicHoliday
{
    public Guid Id { get; private set; }
    public AustralianState State { get; private set; }
    public DateOnly Date { get; private set; }
    public string Name { get; private set; } = null!;
    public bool IsNational { get; private set; }

    private PublicHoliday() { } // EF Core

    public static PublicHoliday Create(Guid id, AustralianState state, DateOnly date, string name, bool isNational) =>
        new()
        {
            Id = id,
            State = state,
            Date = date,
            Name = name,
            IsNational = isNational,
        };
}
