using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Manager inbox for flagged clock-out variance, same "IVenueScopedRequest
/// alone isn't enough" reasoning as GetPendingSwapsForVenueQuery — a staff
/// member's own venue claims would also satisfy VenueId scoping, so
/// PermissionLevel is checked explicitly in the handler.
/// </summary>
public sealed record GetFlaggedTimeEntriesQuery(Guid VenueId)
    : IRequest<IReadOnlyList<TimeEntryDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class GetFlaggedTimeEntriesQueryHandler(ITimeEntryLookup timeEntryLookup)
    : IRequestHandler<GetFlaggedTimeEntriesQuery, IReadOnlyList<TimeEntryDto>>
{
    public Task<IReadOnlyList<TimeEntryDto>> Handle(GetFlaggedTimeEntriesQuery request, CancellationToken cancellationToken) =>
        timeEntryLookup.GetFlaggedForVenueAsync(request.VenueId, cancellationToken);
}
