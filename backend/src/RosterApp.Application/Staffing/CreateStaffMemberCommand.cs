using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Staffing;

public sealed record CreateStaffMemberCommand(
    string Name,
    string Email,
    string Phone,
    DateOnly DateOfBirth,
    string EmploymentType,
    string Classification,
    int MaxWeeklyHours,
    IReadOnlyList<Guid> VenueIds,
    string PermissionLevel,
    Guid? PrimaryRoleId
) : IRequest<StaffMemberDto>, IRequiresPermissionLevel
{
    // Flat Manager minimum to create a new staff member at all. Note: this
    // command lets the caller set the new hire's own PermissionLevel
    // (including Owner) without a separate, higher-tier check on that
    // field — see CLAUDE.md's Authorization & permission policy section
    // for why that's called out as a known residual gap rather than
    // silently left unaddressed.
    RosterApp.Domain.Staffing.PermissionLevel? IRequiresPermissionLevel.MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Manager;
}

/// <summary>
/// Email/phone uniqueness (scoped per-organisation — see
/// IStaffUniquenessChecker) runs as async FluentValidation rules, same
/// pattern as the double-booking guard in CreateShiftCommandValidator, so
/// it gets the same 400 + field-level error shape as every other
/// validation failure. The DB's unique (OrganisationId, Email)/
/// (OrganisationId, Phone) indexes are the backstop for a race between two
/// concurrent creates — see CreateStaffMemberCommandHandler.
/// </summary>
public sealed class CreateStaffMemberCommandValidator : AbstractValidator<CreateStaffMemberCommand>
{
    public CreateStaffMemberCommandValidator(
        IStaffUniquenessChecker uniquenessChecker,
        IRoleLookup roleLookup,
        ICurrentTenantContext tenantContext)
    {
        RuleFor(c => c.Name).NotEmpty().MaximumLength(200);
        RuleFor(c => c.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(c => c.Phone)
            .NotEmpty()
            .MaximumLength(30)
            .Must(phone => PhoneNumber.TryCreateMobile(phone, out _, out _))
            .WithMessage("Phone number must be a valid Australian mobile number.");
        RuleFor(c => c.DateOfBirth)
            .LessThan(DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Date of birth must be in the past.");
        RuleFor(c => c.EmploymentType)
            .Must(EnumWireValidation.IsDefinedName<EmploymentType>)
            .WithMessage("Invalid employment type.");
        RuleFor(c => c.Classification)
            .Must(EnumWireValidation.IsDefinedName<AwardClassification>)
            .WithMessage("Invalid classification.");
        RuleFor(c => c.MaxWeeklyHours).GreaterThan(0).LessThanOrEqualTo(76);
        RuleFor(c => c.VenueIds).NotEmpty();
        RuleFor(c => c.PermissionLevel)
            .Must(EnumWireValidation.IsDefinedName<PermissionLevel>)
            .WithMessage("Invalid permission level.");

        RuleFor(c => c.PrimaryRoleId)
            .MustAsync(async (roleId, ct) => roleId is null || await roleLookup.GetRoleAsync(roleId.Value, ct) is not null)
            .WithMessage("Primary role does not exist.");

        RuleFor(c => c.Email)
            .MustAsync(async (email, ct) =>
                !await uniquenessChecker.IsEmailTakenAsync(tenantContext.OrganisationId, email, null, ct))
            .WithMessage("A staff member with this email already exists.");

        RuleFor(c => c.Phone)
            .MustAsync(async (phone, ct) =>
                !await uniquenessChecker.IsPhoneTakenAsync(tenantContext.OrganisationId, phone, null, ct))
            .WithMessage("A staff member with this phone number already exists.");
    }
}

public sealed class CreateStaffMemberCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateStaffMemberCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(
        CreateStaffMemberCommand request,
        CancellationToken cancellationToken
    )
    {
        if (request.VenueIds.Any(id => !tenantContext.AccessibleVenueIds.Contains(id)))
        {
            throw new ForbiddenAccessException(
                "One or more venues are not accessible to the current manager."
            );
        }

        var staff = StaffMember.Create(
            tenantContext.OrganisationId,
            request.Name,
            request.Email,
            request.Phone,
            request.DateOfBirth,
            Enum.Parse<EmploymentType>(request.EmploymentType),
            Enum.Parse<AwardClassification>(request.Classification),
            request.MaxWeeklyHours,
            request.VenueIds,
            Enum.Parse<PermissionLevel>(request.PermissionLevel),
            request.PrimaryRoleId
        );

        staffMemberRepository.Add(staff);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return StaffMemberDto.FromDomain(staff, [], []);
    }
}
