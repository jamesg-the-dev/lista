using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using RosterApp.Infrastructure;

namespace RosterApp.Api.Auth;

public sealed class SupabaseClaimsTransformation(
    RosterDbContext dbContext,
    ILogger<SupabaseClaimsTransformation> logger
) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return principal;
        }

        if (principal.HasClaim(c => c.Type == TenantClaimTypes.ManagerId)
            || principal.HasClaim(c => c.Type == TenantClaimTypes.StaffMemberId))
        {
            return principal;
        }

        var supabaseUserId = principal.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(supabaseUserId))
        {
            logger.LogWarning(
                "Authenticated principal has no 'sub' claim — cannot resolve a Manager or StaffMember record."
            );
            return principal;
        }

        var manager = await dbContext
            .Managers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.SupabaseUserId == supabaseUserId);

        if (manager is not null)
        {
            var managerVenueIds = await dbContext
                .ManagerVenueAccesses.AsNoTracking()
                .Where(a => a.ManagerId == manager.Id)
                .Select(a => a.VenueId)
                .ToListAsync();

            var managerIdentity = new ClaimsIdentity();
            managerIdentity.AddClaim(new Claim(TenantClaimTypes.ManagerId, manager.Id.ToString()));
            managerIdentity.AddClaim(new Claim(TenantClaimTypes.OrganisationId, manager.OrganisationId.ToString()));
            foreach (var venueId in managerVenueIds)
            {
                managerIdentity.AddClaim(new Claim(TenantClaimTypes.VenueId, venueId.ToString()));
            }

            principal.AddIdentity(managerIdentity);
            return principal;
        }

        // Not a Manager — try the staff app's login (Phase 5). A staff
        // member's Supabase account is only linked once they've called
        // LinkStaffSupabaseAccountCommand, so this can legitimately find
        // nothing for a brand-new signup; that's not a warning-worthy case
        // the way an unmatched Manager sub is.
        var staffMember = await dbContext
            .StaffMembers.AsNoTracking()
            .Where(s => s.SupabaseUserId == supabaseUserId)
            .Select(s => new { s.Id, s.OrganisationId })
            .FirstOrDefaultAsync();

        if (staffMember is null)
        {
            return principal;
        }

        var staffVenueIds = await dbContext
            .StaffMembers.AsNoTracking()
            .Where(s => s.Id == staffMember.Id)
            .SelectMany(s => s.VenueAssignments.Select(a => a.VenueId))
            .ToListAsync();

        var staffIdentity = new ClaimsIdentity();
        staffIdentity.AddClaim(new Claim(TenantClaimTypes.StaffMemberId, staffMember.Id.ToString()));
        staffIdentity.AddClaim(new Claim(TenantClaimTypes.OrganisationId, staffMember.OrganisationId.ToString()));
        foreach (var venueId in staffVenueIds)
        {
            staffIdentity.AddClaim(new Claim(TenantClaimTypes.VenueId, venueId.ToString()));
        }

        principal.AddIdentity(staffIdentity);
        return principal;
    }
}
