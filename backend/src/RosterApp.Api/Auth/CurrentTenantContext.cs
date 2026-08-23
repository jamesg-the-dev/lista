using System.Security.Claims;
using RosterApp.Application.Common;
using PermissionLevel = RosterApp.Domain.Staffing.PermissionLevel;

namespace RosterApp.Api.Auth;

public sealed class CurrentTenantContext(IHttpContextAccessor httpContextAccessor)
    : ICurrentTenantContext
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    private string? StaffMemberIdClaim => User?.FindFirst(TenantClaimTypes.StaffMemberId)?.Value;
    private string? OrganisationIdClaim => User?.FindFirst(TenantClaimTypes.OrganisationId)?.Value;
    private string? PermissionLevelClaim => User?.FindFirst(TenantClaimTypes.PermissionLevel)?.Value;

    // Deliberately just "does this request carry a validated Supabase JWT" —
    // NOT "has this JWT been resolved to a StaffMember row yet". Those are
    // separate questions (see StaffMemberId/OrganisationId below, both
    // nullable/defaulted for exactly the unresolved case). Onboarding
    // sign-up and LinkStaffSupabaseAccountCommand both need to run with a
    // valid JWT before any StaffMember/Organisation exists for this user —
    // gating IsAuthenticated on the resolved claims made those commands
    // unreachable (AuthorizationBehavior would reject every request from a
    // brand-new Supabase user, including the one command meant to resolve
    // that exact state).
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;

    public Guid? StaffMemberId => StaffMemberIdClaim is { } value ? Guid.Parse(value) : null;

    public PermissionLevel? PermissionLevel => PermissionLevelClaim is { } value ? Enum.Parse<PermissionLevel>(value) : null;

    public Guid OrganisationId => OrganisationIdClaim is { } value ? Guid.Parse(value) : Guid.Empty;

    public IReadOnlyCollection<Guid> AccessibleVenueIds =>
        User?.FindAll(TenantClaimTypes.VenueId).Select(c => Guid.Parse(c.Value)).ToArray() ?? [];

    // Raw JWT claims, resolved independently of SupabaseClaimsTransformation
    // — see ICurrentTenantContext.SupabaseUserId/Email for why these need
    // to survive an unresolved (not-yet-linked staff) principal.
    public string? SupabaseUserId => User?.FindFirst("sub")?.Value;

    public string? Email => User?.FindFirst("email")?.Value;
}
