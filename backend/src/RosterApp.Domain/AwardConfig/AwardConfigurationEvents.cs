using RosterApp.Domain.Common;

namespace RosterApp.Domain.AwardConfig;

public sealed record AwardConfigurationCreated(Guid AwardConfigurationId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record AwardConfigurationSuperseded(Guid AwardConfigurationId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;
