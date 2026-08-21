using RosterApp.Domain.Common;

namespace RosterApp.Domain.RosterCompliance;

public sealed record RosterComplianceConfigurationCreated(Guid RosterComplianceConfigurationId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record RosterComplianceConfigurationSuperseded(Guid RosterComplianceConfigurationId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;
