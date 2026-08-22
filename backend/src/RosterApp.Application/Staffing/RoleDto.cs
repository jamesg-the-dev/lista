using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Includes the role's currently-active award mapping status flattened in
/// (MappedAwardClassificationId/Name), rather than requiring the UI to
/// cross-reference a separate RoleAwardMapping list — RoleList needs "✓
/// Mapped: F&amp;B Grade 2" / "⚠ Not mapped" per row (§7), and this is the
/// one place both facts are already joined (see IRoleLookup). Null means no
/// currently-active RoleAwardMapping exists for this role.
/// </summary>
public sealed record RoleDto(
    Guid Id,
    Guid VenueId,
    string DisplayName,
    string? ColorTag,
    bool IsActive,
    Guid CreatedByStaffMemberId,
    DateTime CreatedAtUtc,
    Guid? MappedAwardClassificationId,
    string? MappedAwardClassificationName)
{
    public static RoleDto FromDomain(Role role, Guid? mappedAwardClassificationId, string? mappedAwardClassificationName) =>
        new(
            role.Id,
            role.VenueId,
            role.DisplayName,
            role.ColorTag,
            role.IsActive,
            role.CreatedByStaffMemberId,
            role.CreatedAtUtc,
            mappedAwardClassificationId,
            mappedAwardClassificationName);
}
