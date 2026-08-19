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

        if (principal.HasClaim(c => c.Type == TenantClaimTypes.ManagerId))
        {
            return principal;
        }

        var supabaseUserId = principal.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(supabaseUserId))
        {
            logger.LogWarning(
                "Authenticated principal has no 'sub' claim — cannot resolve a Manager record."
            );
            return principal;
        }

        var manager = await dbContext
            .Managers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.SupabaseUserId == supabaseUserId);

        if (manager is null)
        {
            logger.LogWarning(
                "No Manager record found for Supabase user {SupabaseUserId} — request will proceed authenticated but without tenant claims.",
                supabaseUserId
            );
            return principal;
        }

        var venueIds = await dbContext
            .ManagerVenueAccesses.AsNoTracking()
            .Where(a => a.ManagerId == manager.Id)
            .Select(a => a.VenueId)
            .ToListAsync();

        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim(TenantClaimTypes.ManagerId, manager.Id.ToString()));
        identity.AddClaim(
            new Claim(TenantClaimTypes.OrganisationId, manager.OrganisationId.ToString())
        );
        foreach (var venueId in venueIds)
        {
            identity.AddClaim(new Claim(TenantClaimTypes.VenueId, venueId.ToString()));
        }

        principal.AddIdentity(identity);
        return principal;
    }
}
