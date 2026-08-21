namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// System-maintained reference data, one row per classification under an
/// AwardDefinition (e.g. "Level 2" under MA000009) — see AwardDefinition for
/// the seeding rationale. Deliberately named "...Definition" rather than
/// "AwardClassification" so it doesn't collide with
/// RosterApp.Domain.Staffing.AwardClassification, the unrelated hardcoded
/// pay-tier enum StaffMember carries directly today. The two are not wired
/// together yet — StaffMember.Classification doesn't reference this table,
/// and RoleAwardMapping (which will eventually link a venue's custom Role to
/// a row here) is deferred until the Staff & Roles build-order step
/// introduces a real Role entity to hang it off.
/// </summary>
public sealed class AwardClassificationDefinition
{
    public Guid Id { get; private set; }
    public Guid AwardId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }

    private AwardClassificationDefinition() { } // EF Core

    public static AwardClassificationDefinition Create(Guid id, Guid awardId, string name, string? description) =>
        new()
        {
            Id = id,
            AwardId = awardId,
            Name = name,
            Description = description,
        };
}
