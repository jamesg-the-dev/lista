using RosterApp.Domain.ValueObjects;

namespace RosterApp.Infrastructure.RosterCompliance;

/// <summary>
/// System-maintained public holiday reference data (§2 AC3, §6), seeded via
/// an idempotent startup seeder (PublicHolidayReferenceDataSeeder) — same
/// "data change not a code deploy" rationale, and the same reduced-scope
/// precedent, as AwardReferenceDataSeed (which only seeds real classification
/// data for MA000009). Only the 2026
/// calendar year is seeded for MVP; extending into 2027 is a follow-up data
/// migration before the end of 2026, not a code change. National dates
/// (IsNational = true) are duplicated one row per state per
/// PublicHoliday's schema, since GetPublicHolidaysQuery always filters by a
/// single state and some nationally observed dates are substituted
/// differently per state in reality (not modelled here — see below).
///
/// Dates are computed from the standard Gregorian Easter algorithm and known
/// fixed/nth-weekday rules, not pulled from an authoritative government
/// calendar feed — same "illustrative, needs independent verification"
/// disclaimer CLAUDE.md applies to award figures applies here too. In
/// particular, Anzac Day 2026 falls on a Saturday; several states observe a
/// substitute weekday in that case and this seed does not model that
/// substitution. Reconcile against each state's official calendar (e.g.
/// data.gov.au) before relying on this for real penalty-rate calculation.
/// </summary>
public static class PublicHolidayReferenceDataSeed
{
    public sealed record HolidaySeed(Guid Id, AustralianState State, DateOnly Date, string Name, bool IsNational);

    private static readonly AustralianState[] AllStates =
    [
        AustralianState.NSW,
        AustralianState.VIC,
        AustralianState.QLD,
        AustralianState.WA,
        AustralianState.SA,
        AustralianState.TAS,
        AustralianState.ACT,
        AustralianState.NT,
    ];

    /// <summary>(Date, Name) pairs observed nationally in 2026 — one row seeded per state.</summary>
    private static readonly (DateOnly Date, string Name)[] NationalHolidays2026 =
    [
        (new DateOnly(2026, 1, 1), "New Year's Day"),
        (new DateOnly(2026, 1, 26), "Australia Day"),
        (new DateOnly(2026, 4, 3), "Good Friday"),
        (new DateOnly(2026, 4, 6), "Easter Monday"),
        (new DateOnly(2026, 4, 25), "Anzac Day"),
        (new DateOnly(2026, 12, 25), "Christmas Day"),
        (new DateOnly(2026, 12, 26), "Boxing Day"),
    ];

    /// <summary>VIC-specific 2026 holidays not observed nationally.</summary>
    private static readonly (DateOnly Date, string Name)[] VicOnlyHolidays2026 =
    [
        (new DateOnly(2026, 4, 4), "Easter Saturday"),
        (new DateOnly(2026, 3, 9), "Labour Day"),
        (new DateOnly(2026, 6, 8), "King's Birthday"),
        (new DateOnly(2026, 9, 25), "Friday before AFL Grand Final"),
        (new DateOnly(2026, 11, 3), "Melbourne Cup Day"),
    ];

    public static IReadOnlyList<HolidaySeed> AllSeeds { get; } = BuildSeeds();

    private static IReadOnlyList<HolidaySeed> BuildSeeds()
    {
        var seeds = new List<HolidaySeed>();
        var index = 1;

        foreach (var state in AllStates)
        {
            foreach (var (date, name) in NationalHolidays2026)
            {
                seeds.Add(new HolidaySeed(DeterministicId(index++), state, date, name, IsNational: true));
            }
        }

        foreach (var (date, name) in VicOnlyHolidays2026)
        {
            seeds.Add(new HolidaySeed(DeterministicId(index++), AustralianState.VIC, date, name, IsNational: false));
        }

        return seeds;
    }

    /// <summary>Stable, reproducible id per seed row — the exact figure doesn't matter, only that it's the same value every time this seed runs.</summary>
    private static Guid DeterministicId(int index) => new($"55555555-0000-0000-0000-{index:D12}");
}
