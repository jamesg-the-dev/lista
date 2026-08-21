using RosterApp.Domain.Common;

namespace RosterApp.Domain.AwardConfig;

public sealed record RoleAwardMappingCreated(Guid RoleAwardMappingId, Guid VenueId, Guid RoleId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record RoleAwardMappingSuperseded(Guid RoleAwardMappingId, Guid VenueId, Guid RoleId, DateTime OccurredAtUtc) : IDomainEvent;
