namespace RosterApp.Application.Staffing;

/// <summary>
/// Narrow read port consumed from CreateStaffMemberCommandValidator /
/// UpdateStaffMemberCommandValidator to enforce that email and phone are
/// unique within an organisation (not globally — two unrelated tenants on
/// this SaaS can share an email/phone). Same async-validation-rule pattern
/// as IStaffAvailabilityChecker. Backed at the DB level by the unique
/// (OrganisationId, Email) / (OrganisationId, Phone) indexes in
/// StaffMemberConfiguration, which is the last line of defence against a
/// race between two concurrent creates.
/// </summary>
public interface IStaffUniquenessChecker
{
    Task<bool> IsEmailTakenAsync(
        Guid organisationId,
        string email,
        Guid? excludeStaffMemberId,
        CancellationToken cancellationToken);

    Task<bool> IsPhoneTakenAsync(
        Guid organisationId,
        string phone,
        Guid? excludeStaffMemberId,
        CancellationToken cancellationToken);
}
