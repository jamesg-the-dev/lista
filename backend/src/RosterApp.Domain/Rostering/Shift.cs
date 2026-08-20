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
        IReadOnlyList<AwardBreakdownLine> awardBreakdown)
    {
        EmployeeId = employeeId;
        ShiftDate = shiftDate;
        Start = start;
        End = end;
        UnpaidBreakMinutes = unpaidBreakMinutes;

        _awardBreakdown.Clear();
        _awardBreakdown.AddRange(awardBreakdown);

        AddDomainEvent(new ShiftUpdated(Id, VenueId, DateTime.UtcNow));
    }

    public void MarkForDeletion()
    {
        AddDomainEvent(new ShiftDeleted(Id, VenueId, DateTime.UtcNow));
    }
}
