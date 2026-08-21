namespace RosterApp.Application.Tenancy;

/// <summary>Read-side port for Venue — no-tracking projections, mirrors IStaffLookup.</summary>
public interface IVenueLookup
{
    Task<VenueDto?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken);

    Task<IReadOnlyList<VenueDto>> GetForOrganisationAsync(Guid organisationId, CancellationToken cancellationToken);
}
