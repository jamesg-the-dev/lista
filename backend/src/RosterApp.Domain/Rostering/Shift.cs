using RosterApp.Domain.Common;

namespace RosterApp.Domain.Rostering;

public enum ShiftStatus
{
    Draft,
    Published,
    Confirmed,
    Cancelled,
}

/// <summary>
/// Aggregate root for a single rostered shift. State transitions raise
/// domain events (ShiftCreated, ShiftUpdated, ShiftDeleted) picked up by
/// AuditSaveChangesInterceptor for the append-only audit trail. Carries its
/// own itemised award-rate breakdown and compliance violations rather than
/// a single total/flag — see CLAUDE.md "Why it exists".
/// </summary>
public sealed class Shift : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid EmployeeId { get; private set; }
    public DateOnly ShiftDate { get; private set; }
    public TimeOnly Start { get; private set; }
    public TimeOnly End { get; private set; }
    public int UnpaidBreakMinutes { get; private set; }

    /// <summary>
    /// The pre-loading rate the award breakdown was calculated from.
    /// Persisted (rather than only implied by AwardBreakdownLine.RatePerHour,
    /// which already has day-type multipliers applied) so operations like
    /// DuplicateRosterCommand can re-run IAwardRateCalculator for a new date
    /// without reverse-engineering a multiplier out of the breakdown.
    /// </summary>
    public decimal BaseRatePerHour { get; private set; }

    public ShiftStatus Status { get; private set; } = ShiftStatus.Draft;

    private readonly List<AwardBreakdownLine> _awardBreakdown = [];
    public IReadOnlyList<AwardBreakdownLine> AwardBreakdown => _awardBreakdown.AsReadOnly();

    private readonly List<ComplianceViolation> _complianceViolations = [];
    public IReadOnlyList<ComplianceViolation> ComplianceViolations => _complianceViolations.AsReadOnly();

    // TODO: concurrency token for optimistic concurrency on drag/drop edits from two managers

    private Shift() { } // EF Core

    public static Shift Create(
        Guid venueId,
        Guid employeeId,
        DateOnly shiftDate,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        IReadOnlyList<AwardBreakdownLine> awardBreakdown)
    {
        var shift = new Shift
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            EmployeeId = employeeId,
            ShiftDate = shiftDate,
            Start = start,
            End = end,
            UnpaidBreakMinutes = unpaidBreakMinutes,
            BaseRatePerHour = baseRatePerHour,
            Status = ShiftStatus.Draft,
        };

        shift._awardBreakdown.AddRange(awardBreakdown);
        shift.AddDomainEvent(new ShiftCreated(shift.Id, shift.VenueId, DateTime.UtcNow));

        return shift;
    }

    public void UpdateSchedule(
        Guid employeeId,
        DateOnly shiftDate,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour,
        IReadOnlyList<AwardBreakdownLine> awardBreakdown)
    {
        EmployeeId = employeeId;
        ShiftDate = shiftDate;
        Start = start;
        End = end;
        UnpaidBreakMinutes = unpaidBreakMinutes;
        BaseRatePerHour = baseRatePerHour;

        _awardBreakdown.Clear();
        _awardBreakdown.AddRange(awardBreakdown);

        AddDomainEvent(new ShiftUpdated(Id, VenueId, DateTime.UtcNow));
    }

    public void MarkForDeletion()
    {
        AddDomainEvent(new ShiftDeleted(Id, VenueId, DateTime.UtcNow));
    }

    /// <summary>
    /// Replaces the full violations collection with a freshly computed set
    /// from IRosterComplianceValidator. Called after Create/UpdateSchedule
    /// (or as part of DuplicateRosterCommand), so any previously acknowledged
    /// violation is intentionally not carried forward — the schedule that was
    /// overridden no longer exists once the shift has been edited.
    /// </summary>
    public void SetComplianceViolations(IReadOnlyList<ComplianceViolation> violations)
    {
        _complianceViolations.Clear();
        _complianceViolations.AddRange(violations);
    }

    /// <summary>
    /// Manager override flow: flips a violation to acknowledged with a
    /// reason rather than deleting it, so the audit trail (via
    /// ComplianceViolationOverridden) keeps a record of what was overridden
    /// and why. Callers should confirm an outstanding violation of this type
    /// exists first (see OverrideComplianceViolationCommandHandler) — the
    /// exception here is a last-resort invariant check, not the primary
    /// validation path.
    /// </summary>
    public void AcknowledgeComplianceViolation(ComplianceViolationType violationType, string reason)
    {
        var index = _complianceViolations.FindIndex(v => v.Type == violationType && !v.Acknowledged);
        if (index < 0)
        {
            throw new InvalidOperationException(
                $"Shift '{Id}' has no outstanding compliance violation of type '{violationType}' to override.");
        }

        _complianceViolations[index] = _complianceViolations[index] with { Acknowledged = true, OverrideReason = reason };

        AddDomainEvent(new ComplianceViolationOverridden(Id, VenueId, violationType, reason, DateTime.UtcNow));
    }
}
