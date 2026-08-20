using System.Security.Claims;
using RosterApp.Application.Common;

namespace RosterApp.Api.Auth;

public sealed class CurrentTenantContext(IHttpContextAccessor httpContextAccessor)
    : ICurrentTenantContext
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    private string? ManagerIdClaim => User?.FindFirst(TenantClaimTypes.ManagerId)?.Value;
    private string? StaffMemberIdClaim => User?.FindFirst(TenantClaimTypes.StaffMemberId)?.Value;
    private string? OrganisationIdClaim => User?.FindFirst(TenantClaimTypes.OrganisationId)?.Value;

    public bool IsAuthenticated => (ManagerIdClaim is not null || StaffMemberIdClaim is not null) && OrganisationIdClaim is not null;

    public Guid ManagerId => ManagerIdClaim is { } value ? Guid.Parse(value) : Guid.Empty;

    public bool IsManager => ManagerIdClaim is not null;

    public Guid? StaffMemberId => StaffMemberIdClaim is { } value ? Guid.Parse(value) : null;

    public bool IsStaff => StaffMemberIdClaim is not null;

    public Guid OrganisationId => OrganisationIdClaim is { } value ? Guid.Parse(value) : Guid.Empty;

    public IReadOnlyCollection<Guid> AccessibleVenueIds =>
        User?.FindAll(TenantClaimTypes.VenueId).Select(c => Guid.Parse(c.Value)).ToArray() ?? [];

    // Raw JWT claims, resolved independently of SupabaseClaimsTransformation
    // — see ICurrentTenantContext.SupabaseUserId/Email for why these need
    // to survive an unresolved (not-yet-linked staff) principal.
    public string? SupabaseUserId => User?.FindFirst("sub")?.Value;

    public string? Email => User?.FindFirst("email")?.Value;
}
