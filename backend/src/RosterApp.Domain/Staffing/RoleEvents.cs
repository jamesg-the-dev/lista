using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public sealed record RoleCreated(Guid RoleId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record RoleDeactivated(Guid RoleId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;
