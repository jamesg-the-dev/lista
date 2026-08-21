using RosterApp.Domain.Common;

namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Links a venue-defined Role (RosterApp.Domain.Staffing) to a system
/// AwardClassificationDefinition — see FEATURE_SETTINGS_AWARD_PAY_CONFIG.md
/// §3/§4 and FEATURE_SETTINGS_STAFF_ROLES.md §1's cross-reference (the Role
/// entity lives in Staff & Roles, this mapping lives in Award & Pay's
/// domain since it's versioned the same way AwardConfiguration is). Never
/// updated in place, same temporal-versioning rationale as
/// AwardConfiguration: SetRoleAwardMappingCommandHandler supersedes the
/// current active row for a RoleId (if any) and inserts a new one, so
/// IAwardRateCalculator can resolve "what classification was this role
/// mapped to on the shift's date" rather than "what's mapped today".
/// </summary>
public sealed class RoleAwardMapping : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid RoleId { get; private set; }
    public Guid AwardClassificationId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public Guid CreatedByManagerId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private RoleAwardMapping() { } // EF Core

    public static RoleAwardMapping CreateNewVersion(
        Guid venueId,
        Guid roleId,
        Guid awardClassificationId,
        Guid createdByManagerId)
    {
        var now = DateTime.UtcNow;
        var mapping = new RoleAwardMapping
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            RoleId = roleId,
            AwardClassificationId = awardClassificationId,
            EffectiveFromUtc = now,
            CreatedByManagerId = createdByManagerId,
            CreatedAtUtc = now,
        };

        mapping.AddDomainEvent(new RoleAwardMappingCreated(mapping.Id, mapping.VenueId, mapping.RoleId, now));

        return mapping;
    }

    /// <summary>Closes out this version — called on the outgoing row before its replacement is created.</summary>
    public void Supersede(DateTime supersededAtUtc)
    {
        EffectiveToUtc = supersededAtUtc;
        AddDomainEvent(new RoleAwardMappingSuperseded(Id, VenueId, RoleId, supersededAtUtc));
    }
}
