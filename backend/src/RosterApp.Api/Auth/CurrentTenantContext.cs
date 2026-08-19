using System.Security.Claims;
using RosterApp.Application.Common;

namespace RosterApp.Api.Auth;

public sealed class CurrentTenantContext(IHttpContextAccessor httpContextAccessor)
    : ICurrentTenantContext
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    private string? ManagerIdClaim => User?.FindFirst(TenantClaimTypes.ManagerId)?.Value;
    private string? OrganisationIdClaim => User?.FindFirst(TenantClaimTypes.OrganisationId)?.Value;

    public bool IsAuthenticated => ManagerIdClaim is not null && OrganisationIdClaim is not null;

    public Guid ManagerId => ManagerIdClaim is { } value ? Guid.Parse(value) : Guid.Empty;

    public Guid OrganisationId => OrganisationIdClaim is { } value ? Guid.Parse(value) : Guid.Empty;

    public IReadOnlyCollection<Guid> AccessibleVenueIds =>
        User?.FindAll(TenantClaimTypes.VenueId).Select(c => Guid.Parse(c.Value)).ToArray() ?? [];
}
