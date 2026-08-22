using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Write-side port for the Shift aggregate, implemented in Infrastructure
/// directly against RosterDbContext. Read-heavy queries (e.g.
/// GetRosterForWeekQuery) go through IRosterLookup instead, so the write
/// path stays a plain tracked-entity repository and the read path stays a
/// no-tracking projection.
/// </summary>
public interface IShiftRepository
{
    Task<Shift?> GetByIdAsync(Guid shiftId, CancellationToken cancellationToken);
    void Add(Shift shift);
    void Remove(Shift shift);

    /// <summary>Backs DeactivateVenueCommandHandler's "can't deactivate a venue with a published future roster" check.</summary>
    Task<bool> HasFuturePublishedShiftsAsync(Guid venueId, DateOnly onOrAfter, CancellationToken cancellationToken);

    /// <summary>Backs DeactivateStaffMemberCommandHandler's equivalent check, scoped to one employee rather than a venue.</summary>
    Task<bool> HasFuturePublishedShiftsForStaffMemberAsync(Guid staffMemberId, DateOnly onOrAfter, CancellationToken cancellationToken);
}
