using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

/// <summary>
/// Venue-scoped, owner-defined display label for a job (e.g. "Bartender",
/// "Head Chef") — see FEATURE_SETTINGS_STAFF_ROLES.md §3. Deliberately does
/// not carry the award classification itself: RoleAwardMapping
/// (RosterApp.Domain.AwardConfig) links a Role to a classification and is
/// versioned independently, so re-mapping a role to a different
/// classification never touches this entity. AggregateRoot for the same
/// reason as Venue/StaffMember — role create/deactivate goes through the
/// audit trail via AuditSaveChangesInterceptor.
/// </summary>
public sealed class Role : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public string DisplayName { get; private set; } = null!;
    public string? ColorTag { get; private set; }
    public bool IsActive { get; private set; } = true;
    public Guid CreatedByManagerId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private Role() { } // EF Core

    public static Role Create(Guid venueId, string displayName, string? colorTag, Guid createdByManagerId)
    {
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ArgumentException("Role name is required.", nameof(displayName));
        }

        var role = new Role
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            DisplayName = displayName.Trim(),
            ColorTag = colorTag,
            IsActive = true,
            CreatedByManagerId = createdByManagerId,
            CreatedAtUtc = DateTime.UtcNow,
        };

        role.AddDomainEvent(new RoleCreated(role.Id, role.VenueId, DateTime.UtcNow));

        return role;
    }

    /// <summary>
    /// Soft-delete only, per §6 — a role is never hard-deleted since past
    /// shifts/rosters may still reference it by RoleId. Callers (
    /// DeactivateRoleCommandHandler) are responsible for checking the role
    /// isn't the PrimaryRoleId of any active staff member and isn't used by
    /// a future/published roster before calling this.
    /// </summary>
    public void Deactivate()
    {
        if (!IsActive)
        {
            return;
        }

        IsActive = false;
        AddDomainEvent(new RoleDeactivated(Id, VenueId, DateTime.UtcNow));
    }
}
