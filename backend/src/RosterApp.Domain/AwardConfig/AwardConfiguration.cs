using RosterApp.Domain.Common;

namespace RosterApp.Domain.AwardConfig;

public enum PayPeriod
{
    Weekly,
    Fortnightly,
}

/// <summary>
/// Versioned, one-per-venue-at-a-time configuration (aggregate root) — see
/// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §3/§4. Never updated in place: an
/// "edit" is UpdateAwardConfigurationCommandHandler calling Supersede() on
/// the current row (closing EffectiveToUtc) and CreateNewVersion() to insert
/// a new one. This is the single most important decision in this section —
/// IAwardRateCalculator must eventually resolve "what config was active on
/// the shift's date" rather than "what's active now", so historical payroll
/// runs stay correct after a rate/config change (same append-only
/// philosophy as the audit trail). A partial unique index enforces "only one
/// currently-active (EffectiveToUtc IS NULL) row per venue" at the DB level
/// (see AwardConfigurationConfiguration).
/// </summary>
public sealed class AwardConfiguration : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid AwardId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public decimal CasualLoadingPercent { get; private set; }
    public decimal SuperannuationRatePercent { get; private set; }
    public PayPeriod PayPeriod { get; private set; }
    public DayOfWeek PayPeriodCutoffDay { get; private set; }
    public Guid CreatedByManagerId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private readonly List<PenaltyRateToggle> _penaltyToggles = [];
    public IReadOnlyList<PenaltyRateToggle> PenaltyToggles => _penaltyToggles.AsReadOnly();

    private AwardConfiguration() { } // EF Core

    /// <summary>
    /// Both minimum-comparison arguments are resolved by the caller (handler),
    /// not looked up here — this keeps the aggregate a pure function over its
    /// inputs, easy to unit test, with no repository dependency of its own
    /// (same rationale as IRosterComplianceValidator staying pure). The
    /// casual-loading floor is a hard block with no override (it's a legal
    /// minimum); the super-rate floor is a soft block the caller can bypass
    /// with ownerConfirmedBelowMinimum. Both checks are also enforced as
    /// FluentValidation rules on UpdateAwardConfigurationCommand, which is
    /// the primary 400-with-field-error path a caller actually hits — these
    /// are a defense-in-depth backstop against an invariant violation
    /// reaching persistence some other way.
    /// </summary>
    public static AwardConfiguration CreateNewVersion(
        Guid venueId,
        Guid awardId,
        decimal casualLoadingPercent,
        decimal awardMinCasualLoadingPercent,
        decimal superannuationRatePercent,
        decimal statutoryMinSuperRatePercent,
        PayPeriod payPeriod,
        DayOfWeek payPeriodCutoffDay,
        IEnumerable<PenaltyRateToggle> penaltyToggles,
        Guid createdByManagerId,
        bool ownerConfirmedBelowMinimum = false)
    {
        if (casualLoadingPercent < awardMinCasualLoadingPercent)
        {
            throw new InvalidOperationException(
                $"Casual loading {casualLoadingPercent}% is below the award-mandated minimum " +
                $"{awardMinCasualLoadingPercent}% and cannot be saved.");
        }

        if (superannuationRatePercent < statutoryMinSuperRatePercent && !ownerConfirmedBelowMinimum)
        {
            throw new InvalidOperationException(
                $"Super rate {superannuationRatePercent}% is below the statutory minimum " +
                $"{statutoryMinSuperRatePercent}%. Confirmation required to proceed.");
        }

        var now = DateTime.UtcNow;
        var config = new AwardConfiguration
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            AwardId = awardId,
            EffectiveFromUtc = now,
            CasualLoadingPercent = casualLoadingPercent,
            SuperannuationRatePercent = superannuationRatePercent,
            PayPeriod = payPeriod,
            PayPeriodCutoffDay = payPeriodCutoffDay,
            CreatedByManagerId = createdByManagerId,
            CreatedAtUtc = now,
        };

        config._penaltyToggles.AddRange(penaltyToggles);
        config.AddDomainEvent(new AwardConfigurationCreated(config.Id, config.VenueId, now));

        return config;
    }

    /// <summary>Closes out this version so it stops being "currently active" — called on the outgoing row before its replacement is created.</summary>
    public void Supersede(DateTime supersededAtUtc)
    {
        EffectiveToUtc = supersededAtUtc;
        AddDomainEvent(new AwardConfigurationSuperseded(Id, VenueId, supersededAtUtc));
    }
}
