using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Unblocks the Phase 4 labour-cost dashboard's forecast-vs-actual stub
/// (CLAUDE.md build order step 4/6) — the first place actual clocked hours
/// become available to compare against the roster.
/// </summary>
public sealed record GetActualVsRosteredQuery(Guid VenueId, DateOnly WeekStart) : IRequest<IReadOnlyList<ShiftVarianceDto>>, IVenueScopedRequest;

public sealed class GetActualVsRosteredQueryHandler(
    ITimeEntryLookup timeEntryLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetActualVsRosteredQuery, IReadOnlyList<ShiftVarianceDto>>
{
    public async Task<IReadOnlyList<ShiftVarianceDto>> Handle(GetActualVsRosteredQuery request, CancellationToken cancellationToken)
    {
        if (!tenantContext.IsManager)
        {
            throw new ForbiddenAccessException("Only a manager can view the rostered-vs-actual report.");
        }

        return await timeEntryLookup.GetActualVsRosteredAsync(request.VenueId, request.WeekStart, cancellationToken);
    }
}

/// <summary>
/// One row per rostered Shift in the venue/week (not per TimeEntry) so a
/// shift nobody has clocked into yet still shows up with ActualMinutes
/// null, rather than silently vanishing from the report.
/// </summary>
public sealed record ShiftVarianceDto(
    Guid ShiftId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    int RosteredMinutes,
    Guid? TimeEntryId,
    int? ActualMinutes,
    int? VarianceMinutes,
    string? VarianceStatus);
