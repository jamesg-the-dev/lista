using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Write-side port for the Organisation aggregate root. Previously unused —
/// Organisation.Create existed in the domain but no Application-layer
/// command persisted one, since every prior flow assumed an Organisation
/// already existed. SignUpCommand (onboarding bootstrap) is the first
/// caller.
/// </summary>
public interface IOrganisationRepository
{
    void Add(Organisation organisation);
}
