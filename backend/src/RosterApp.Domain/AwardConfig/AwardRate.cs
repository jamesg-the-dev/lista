namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Owned by AwardRate — the award-mandated multiplier for a penalty type
/// (e.g. Saturday x1.25), distinct from AwardConfiguration.PenaltyRateToggle
/// which is the venue's own enabled/disabled choice, not a rate.
/// </summary>
public sealed record PenaltyMultiplier(PenaltyType PenaltyType, decimal Multiplier)
{
    public static PenaltyMultiplier Create(PenaltyType type, decimal multiplier) => new(type, multiplier);
}

/// <summary>
/// Versioned system reference data — one row per classification per
/// effective period (e.g. a July wage review inserts a new row rather than
/// editing the prior one in place). EffectiveToUtc null means currently
/// active. Once IAwardRateCalculator is wired to classification (see
/// RosterApp.Domain.Staffing.AwardClassification's TODO), it must resolve
/// the row effective on the shift's date — never "today's" row — so a past
/// pay period recalculates correctly after a rate change. Figures seeded for
/// MA000009 are illustrative only, same disclaimer as
/// HospitalityGeneralAwardRateCalculator (see CLAUDE.md § Award compliance).
/// </summary>
public sealed class AwardRate
{
    public Guid Id { get; private set; }
    public Guid AwardClassificationId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public decimal BaseHourlyRate { get; private set; }

    /// <summary>Award-mandated floor — an owner's AwardConfiguration.CasualLoadingPercent can't go below this.</summary>
    public decimal CasualLoadingPercentMin { get; private set; }

    private readonly List<PenaltyMultiplier> _penaltyMultipliers = [];
    public IReadOnlyList<PenaltyMultiplier> PenaltyMultipliers => _penaltyMultipliers.AsReadOnly();

    private AwardRate() { } // EF Core

    public static AwardRate Create(
        Guid id,
        Guid awardClassificationId,
        DateTime effectiveFromUtc,
        decimal baseHourlyRate,
        decimal casualLoadingPercentMin,
        IEnumerable<PenaltyMultiplier> penaltyMultipliers)
    {
        var rate = new AwardRate
        {
            Id = id,
            AwardClassificationId = awardClassificationId,
            EffectiveFromUtc = effectiveFromUtc,
            BaseHourlyRate = baseHourlyRate,
            CasualLoadingPercentMin = casualLoadingPercentMin,
        };

        rate._penaltyMultipliers.AddRange(penaltyMultipliers);
        return rate;
    }
}
