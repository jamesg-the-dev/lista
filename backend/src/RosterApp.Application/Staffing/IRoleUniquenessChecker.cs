namespace RosterApp.Application.Staffing;

/// <summary>
/// Enforces "role display names are unique per venue, case-insensitive,
/// among active roles" (§6) as an async FluentValidation rule, same pattern
/// as IStaffUniquenessChecker. Backed at the DB level by the partial unique
/// index on (VenueId, lower(DisplayName)) WHERE IsActive — see
/// RoleConfiguration — which is the last line of defence against a race
/// between two concurrent creates.
/// </summary>
public interface IRoleUniquenessChecker
{
    Task<bool> IsDisplayNameTakenAsync(
        Guid venueId,
        string displayName,
        Guid? excludeRoleId,
        CancellationToken cancellationToken);
}
