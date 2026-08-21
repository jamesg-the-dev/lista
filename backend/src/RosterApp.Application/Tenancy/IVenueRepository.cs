using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Write-side port for the Venue aggregate — tracked-entity repository,
/// same shape as IShiftRepository/IStaffMemberRepository. Read-heavy
/// queries (venue profile, venue list for org) go through IVenueLookup
/// instead, matching the rest of the codebase's repository/lookup split.
/// </summary>
public interface IVenueRepository
{
    Task<Venue?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken);

    void Add(Venue venue);

    /// <summary>Backs DeactivateVenueCommandHandler's "an organisation must always have at least one active venue" invariant.</summary>
    Task<int> CountActiveAsync(Guid organisationId, CancellationToken cancellationToken);
}
