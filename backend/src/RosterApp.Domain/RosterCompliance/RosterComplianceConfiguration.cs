using RosterApp.Domain.Common;

namespace RosterApp.Domain.RosterCompliance;

/// <summary>
/// Versioned, one-per-venue-at-a-time configuration (aggregate root) — see
/// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md §3/§4. Same temporal-versioning
/// shape as AwardConfiguration: never updated in place, an "edit" is
/// UpdateRosterComplianceConfigurationCommandHandler calling Supersede() on
/// the current row and CreateNewVersion() to insert a new one, so a past
/// roster's compliance decisions stay explainable against the rules active
/// when it was built. A partial unique index enforces "only one
/// currently-active (EffectiveToUtc IS NULL) row per venue" at the DB level
/// (see RosterComplianceConfigurationConfiguration).
///
/// Hard vs soft rule handling is not a per-field toggle: MinRestBetweenShiftsMinutes
/// and MinorRules are always-hard legal minimums (no owner override for
/// "make rest period a warning instead"), while MinShiftLengthMinutes,
/// MaxShiftLengthMinutes, and WeeklyOvertimeThresholdMinutes are soft venue
/// policy layered on top of the award. IRosterComplianceValidator (via
/// RosterComplianceThresholds) reflects this by keeping every MVP violation
/// at Warning severity — see HospitalityGeneralAwardComplianceValidator.
/// </summary>
public sealed class RosterComplianceConfiguration : AggregateRoot
{
    /// <summary>Hospitality award floor — hard block, no override, per §6.</summary>
    public const int MinimumRestBetweenShiftsMinutesFloor = 600;

    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public int MinShiftLengthMinutes { get; private set; }
    public int MaxShiftLengthMinutes { get; private set; }
    public int MinRestBetweenShiftsMinutes { get; private set; }
    public int WeeklyOvertimeThresholdMinutes { get; private set; }
    public MinorRosterRule MinorRules { get; private set; } = null!;
    public Guid CreatedByStaffMemberId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private readonly List<MealBreakRule> _mealBreakRules = [];
    public IReadOnlyList<MealBreakRule> MealBreakRules => _mealBreakRules.AsReadOnly();

    private RosterComplianceConfiguration() { } // EF Core

    public static RosterComplianceConfiguration CreateNewVersion(
        Guid venueId,
        int minShiftLengthMinutes,
        int maxShiftLengthMinutes,
        int minRestBetweenShiftsMinutes,
        int weeklyOvertimeThresholdMinutes,
        MinorRosterRule minorRules,
        IEnumerable<MealBreakRule> mealBreakRules,
        Guid createdByStaffMemberId)
    {
        if (minRestBetweenShiftsMinutes < MinimumRestBetweenShiftsMinutesFloor)
        {
            throw new InvalidOperationException(
                $"Minimum rest between shifts cannot be set below {MinimumRestBetweenShiftsMinutesFloor / 60} hours " +
                $"({MinimumRestBetweenShiftsMinutesFloor} minutes) — this is a legal minimum under the hospitality award.");
        }

        if (minShiftLengthMinutes > maxShiftLengthMinutes)
        {
            throw new InvalidOperationException("Minimum shift length cannot exceed maximum shift length.");
        }

        var now = DateTime.UtcNow;
        var config = new RosterComplianceConfiguration
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            EffectiveFromUtc = now,
            MinShiftLengthMinutes = minShiftLengthMinutes,
            MaxShiftLengthMinutes = maxShiftLengthMinutes,
            MinRestBetweenShiftsMinutes = minRestBetweenShiftsMinutes,
            WeeklyOvertimeThresholdMinutes = weeklyOvertimeThresholdMinutes,
            MinorRules = minorRules,
            CreatedByStaffMemberId = createdByStaffMemberId,
            CreatedAtUtc = now,
        };

        config._mealBreakRules.AddRange(mealBreakRules);
        config.AddDomainEvent(new RosterComplianceConfigurationCreated(config.Id, config.VenueId, now));

        return config;
    }

    /// <summary>Closes out this version so it stops being "currently active" — called on the outgoing row before its replacement is created.</summary>
    public void Supersede(DateTime supersededAtUtc)
    {
        EffectiveToUtc = supersededAtUtc;
        AddDomainEvent(new RosterComplianceConfigurationSuperseded(Id, VenueId, supersededAtUtc));
    }
}
