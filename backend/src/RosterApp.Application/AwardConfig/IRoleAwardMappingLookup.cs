namespace RosterApp.Application.AwardConfig;

/// <summary>Read-side port, no tracking — backs the Award &amp; Pay screen's RoleAwardMappingTable and the shared "unmapped roles" warning.</summary>
public interface IRoleAwardMappingLookup
{
    /// <summary>Every role in the venue with a currently-active mapping (roles with none are simply absent — see GetUnmappedRolesQuery, RosterApp.Application.Staffing).</summary>
    Task<IReadOnlyList<RoleAwardMappingDto>> GetActiveMappingsForVenueAsync(Guid venueId, CancellationToken cancellationToken);
}
