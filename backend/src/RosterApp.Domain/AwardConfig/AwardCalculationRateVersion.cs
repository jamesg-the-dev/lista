namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Versioned, system-maintained legal-minimum figures IAwardRateCalculator
/// consumes at calculate-time — one row per AwardDefinition per effective
/// period (e.g. an annual 1 July wage review inserts a new row rather than
/// editing the current one in place, same append-only pattern as AwardRate/
/// AwardConfiguration). EffectiveToUtc null means currently active.
///
/// Scoped per-AWARD, not per-classification like AwardRate — none of this
/// MVP's calculators vary casual loading or penalty multipliers by
/// classification level (MA000009 clause 11.1 applies "for each hour
/// worked" regardless of classification), so one row per award per period
/// is the right grain. See AwardCalculationRates for how a calculator
/// consumes this, and docs/award-calculator-routing-fix.md for the
/// architecture rationale and the primary-source citations behind the
/// seeded figures.
/// </summary>
public sealed class AwardCalculationRateVersion
{
    public Guid Id { get; private set; }
    public Guid AwardId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public decimal CasualLoadingPercent { get; private set; }

    private readonly List<PenaltyMultiplier> _penaltyMultipliers = [];
    public IReadOnlyList<PenaltyMultiplier> PenaltyMultipliers => _penaltyMultipliers.AsReadOnly();

    private AwardCalculationRateVersion() { } // EF Core

    public static AwardCalculationRateVersion Create(
        Guid id,
        Guid awardId,
        DateTime effectiveFromUtc,
        decimal casualLoadingPercent,
        IEnumerable<PenaltyMultiplier> penaltyMultipliers)
    {
        var version = new AwardCalculationRateVersion
        {
            Id = id,
            AwardId = awardId,
            EffectiveFromUtc = effectiveFromUtc,
            CasualLoadingPercent = casualLoadingPercent,
        };

        version._penaltyMultipliers.AddRange(penaltyMultipliers);
        return version;
    }

    public AwardCalculationRates ToRates() =>
        new(CasualLoadingPercent, PenaltyMultipliers.ToDictionary(m => m.PenaltyType, m => m.Multiplier));

    /// <summary>
    /// Picks the version in force on a given date from a set of versions for
    /// the same award — pure so it's testable without a database (see
    /// AwardCalculationRateVersionTests). "In force" means
    /// EffectiveFromUtc &lt;= asOfUtc &lt; EffectiveToUtc (or EffectiveToUtc
    /// is null). If asOfUtc predates every version — e.g. a shift dated
    /// before this reference data existed — falls back to the earliest
    /// available version rather than throwing, since a roster action on a
    /// historical date shouldn't hard-fail; this is a known limitation for
    /// dates before the seed window, not a substitute for seeding real
    /// historical figures once they're needed.
    /// </summary>
    public static AwardCalculationRateVersion SelectEffectiveAsOf(
        IReadOnlyCollection<AwardCalculationRateVersion> versions,
        DateTime asOfUtc)
    {
        if (versions.Count == 0)
        {
            throw new InvalidOperationException("No AwardCalculationRateVersion rows were provided to select from.");
        }

        var inForce = versions
            .Where(v => v.EffectiveFromUtc <= asOfUtc && (v.EffectiveToUtc is null || asOfUtc < v.EffectiveToUtc))
            .OrderByDescending(v => v.EffectiveFromUtc)
            .FirstOrDefault();

        return inForce ?? versions.OrderBy(v => v.EffectiveFromUtc).First();
    }
}
