using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

public sealed record RoleAwardMappingDto(
    Guid Id,
    Guid VenueId,
    Guid RoleId,
    Guid AwardClassificationId,
    DateTime EffectiveFromUtc,
    DateTime? EffectiveToUtc,
    Guid CreatedByManagerId,
    DateTime CreatedAtUtc)
{
    public static RoleAwardMappingDto FromDomain(RoleAwardMapping mapping) =>
        new(
            mapping.Id,
            mapping.VenueId,
            mapping.RoleId,
            mapping.AwardClassificationId,
            mapping.EffectiveFromUtc,
            mapping.EffectiveToUtc,
            mapping.CreatedByManagerId,
            mapping.CreatedAtUtc);
}
