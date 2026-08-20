using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Manager inbox for flagged clock-out variance, same "IVenueScopedRequest
/// alone isn't enough" reasoning as GetPendingSwapsForVenueQuery — a staff
/// member's own venue claims would also satisfy VenueId scoping, so
/// IsManager is checked explicitly in the handler.
/// </summary>
public sealed record GetFlaggedTimeEntriesQuery(Guid VenueId) : IRequest<IReadOnlyList<TimeEntryDto>>, IVenueScopedRequest;

public sealed class GetFlaggedTimeEntriesQueryHandler(
    ITimeEntryLookup timeEntryLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetFlaggedTimeEntriesQuery, IReadOnlyList<TimeEntryDto>>
{
    public async Task<IReadOnlyList<TimeEntryDto>> Handle(GetFlaggedTimeEntriesQuery request, CancellationToken cancellationToken)
    {
        if (!tenantContext.IsManager)
        {
            throw new ForbiddenAccessException("Only a manager can view flagged time entries.");
        }

        return await timeEntryLookup.GetFlaggedForVenueAsync(request.VenueId, cancellationToken);
    }
}
