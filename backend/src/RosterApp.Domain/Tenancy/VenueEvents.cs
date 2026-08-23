using RosterApp.Domain.Common;

namespace RosterApp.Domain.Tenancy;

public sealed record VenueCreated(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueProfileUpdated(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueTradingHoursUpdated(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueDeactivated(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueAvailabilitySettingsUpdated(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueOnboardingStepStatusChanged(
    Guid VenueId,
    Guid OrganisationId,
    OnboardingStep Step,
    OnboardingStepState State,
    DateTime OccurredAtUtc) : IDomainEvent;

public sealed record VenueOnboardingChecklistDismissed(Guid VenueId, Guid OrganisationId, DateTime OccurredAtUtc) : IDomainEvent;
