using FluentValidation;
using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Rostering;

/// <summary>
/// StaffId comes from ICurrentTenantContext.StaffMemberId, not the request
/// — "my shifts" only ever means the caller's own. No IVenueScopedRequest:
/// a staff member's own venue assignments are already trusted claims on
/// their JWT (see SupabaseClaimsTransformation), and this query spans
/// whichever venues they're assigned to rather than a single one.
/// </summary>
public sealed record GetMyShiftsQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<ShiftDto>>, IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class GetMyShiftsQueryValidator : AbstractValidator<GetMyShiftsQuery>
{
    public GetMyShiftsQueryValidator()
    {
        RuleFor(q => q.To).GreaterThanOrEqualTo(q => q.From);
    }
}

public sealed class GetMyShiftsQueryHandler(
    IRosterLookup rosterLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetMyShiftsQuery, IReadOnlyList<ShiftDto>>
{
    public async Task<IReadOnlyList<ShiftDto>> Handle(GetMyShiftsQuery request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("Only an authenticated staff member has shifts to view here.");
        }

        return await rosterLookup.GetShiftsForEmployeeDtoAsync(staffMemberId, request.From, request.To, cancellationToken);
    }
}
