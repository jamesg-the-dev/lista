using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Infrastructure.Staffing;

public sealed class StaffUniquenessChecker(RosterDbContext dbContext) : IStaffUniquenessChecker
{
    public Task<bool> IsEmailTakenAsync(
        Guid organisationId,
        string email,
        Guid? excludeStaffMemberId,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        return dbContext.StaffMembers
            .AsNoTracking()
            .Where(s => s.OrganisationId == organisationId && s.Email == normalizedEmail)
            .Where(s => excludeStaffMemberId == null || s.Id != excludeStaffMemberId)
            .AnyAsync(cancellationToken);
    }

    public Task<bool> IsPhoneTakenAsync(
        Guid organisationId,
        string phone,
        Guid? excludeStaffMemberId,
        CancellationToken cancellationToken)
    {
        // Malformed input fails the sync PhoneNumber.TryCreateMobile rule in
        // the command validator already — treat it as "not taken" here so
        // this async rule doesn't add a second, confusing error.
        if (!PhoneNumber.TryCreateMobile(phone, out var normalizedPhone, out _))
        {
            return Task.FromResult(false);
        }

        return dbContext.StaffMembers
            .AsNoTracking()
            .Where(s => s.OrganisationId == organisationId && s.Phone == normalizedPhone)
            .Where(s => excludeStaffMemberId == null || s.Id != excludeStaffMemberId)
            .AnyAsync(cancellationToken);
    }
}
