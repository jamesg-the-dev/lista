namespace RosterApp.Domain.Rostering;

public enum ShiftStatus
{
    Draft,
    Published,
    Cancelled,
}

/// <summary>
/// Aggregate root for a single rostered shift. State transitions raise domain
/// events (ShiftCreated, ShiftPublished, ShiftCancelled) so an
/// ISaveChangesInterceptor-based audit interceptor can append an immutable
/// history entry per change — same pattern as Pentana's CauseCorrectionSubmission.
/// </summary>
public sealed class Shift
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid EmployeeId { get; private set; }
    public DateOnly ShiftDate { get; private set; }
    public TimeOnly Start { get; private set; }
    public TimeOnly End { get; private set; }
    public int UnpaidBreakMinutes { get; private set; }
    public ShiftStatus Status { get; private set; } = ShiftStatus.Draft;

    // TODO: MediatR domain events (ShiftCreated, ShiftRescheduled, ShiftCancelled)
    // TODO: concurrency token for optimistic concurrency on drag/drop edits from two managers

    private Shift() { } // EF Core

    public static Shift Create(Guid venueId, Guid employeeId, DateOnly shiftDate, TimeOnly start, TimeOnly end, int unpaidBreakMinutes)
    {
        return new Shift
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
    }
}
