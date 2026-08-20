using MediatR;
using RosterApp.Application.Common;

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
}
