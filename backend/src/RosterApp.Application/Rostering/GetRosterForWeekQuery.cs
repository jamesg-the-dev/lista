using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

public sealed record GetRosterForWeekQuery(Guid VenueId, DateOnly WeekStart)
    : IRequest<IReadOnlyList<ShiftDto>>,
        IVenueScopedRequest;

public sealed class GetRosterForWeekQueryHandler(IRosterLookup rosterLookup)
    : IRequestHandler<GetRosterForWeekQuery, IReadOnlyList<ShiftDto>>
{
    public Task<IReadOnlyList<ShiftDto>> Handle(
        GetRosterForWeekQuery request,
        CancellationToken cancellationToken
    ) => rosterLookup.GetRosterForWeekAsync(request.VenueId, request.WeekStart, cancellationToken);
}

/// <summary>
/// Thin read port over persistence, same pattern as IAccountLookup —
/// no-tracking projection, kept separate from IShiftRepository (the write
/// side) so the read path never shares tracked entities with commands.
/// </summary>
public interface IRosterLookup
{
    Task<IReadOnlyList<ShiftDto>> GetRosterForWeekAsync(
        Guid venueId,
        DateOnly weekStart,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Adjacent shifts for one employee across a date window, used to build
    /// IRosterComplianceValidator's staffMemberContext — rest-between-shifts
    /// and max-consecutive-days checks need shifts outside the single week
    /// being edited (e.g. the shift immediately before a Monday 6am start).
    /// Returns domain Shift entities rather than ShiftDto, since the
    /// validator operates on aggregate state, but stays a no-tracking
    /// projection like the rest of this read port. excludeShiftId lets a
    /// shift being updated exclude itself from its own context.
    /// </summary>
    Task<IReadOnlyList<Shift>> GetShiftsForEmployeeAsync(
        Guid employeeId,
        DateOnly from,
        DateOnly to,
        Guid? excludeShiftId,
        CancellationToken cancellationToken
    );
}
