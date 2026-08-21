namespace RosterApp.Application.RosterCompliance;

/// <summary>Read port over the system-maintained public holiday reference data — owners view this, they never write to it (§6), so there's no matching repository.</summary>
public interface IPublicHolidayLookup
{
    Task<IReadOnlyList<PublicHolidayDto>> GetForStateAsync(string state, DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
