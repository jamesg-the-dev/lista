using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Not IVenueScopedRequest — a staff member can span multiple venues so a
/// single VenueId can't represent tenant scope. Same pattern as
/// GetCurrentAccountQuery: skips TenantScopingBehavior, and the handler
/// checks access itself via ICurrentTenantContext.AccessibleVenueIds
/// against the staff member's actual VenueIds.
/// </summary>
public sealed record UpdateStaffMemberCommand(
    Guid StaffMemberId,
    string Name,
    string Email,
    string Phone,
    int EmploymentType,
    int Classification,
    int MaxWeeklyHours,
    IReadOnlyList<Guid> VenueIds
) : IRequest<StaffMemberDto>;

/// <summary>
/// Same per-organisation email/phone uniqueness guard as
/// CreateStaffMemberCommandValidator — see the comment there for why this
/// is an async validation rule rather than an inline handler check.
/// Excludes StaffMemberId so a member can keep their own email/phone
/// unchanged.
/// </summary>
public sealed class UpdateStaffMemberCommandValidator : AbstractValidator<UpdateStaffMemberCommand>
{
    public UpdateStaffMemberCommandValidator(
        IStaffUniquenessChecker uniquenessChecker,
        ICurrentTenantContext tenantContext)
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
        RuleFor(c => c.Name).NotEmpty().MaximumLength(200);
        RuleFor(c => c.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(c => c.Phone)
            .NotEmpty()
            .MaximumLength(30)
            .Must(phone => PhoneNumber.TryCreateMobile(phone, out _, out _))
            .WithMessage("Phone number must be a valid Australian mobile number.");
        RuleFor(c => c.EmploymentType).Must(v => Enum.IsDefined(typeof(EmploymentType), v))
            .WithMessage("Invalid employment type.");
        RuleFor(c => c.Classification).Must(v => Enum.IsDefined(typeof(AwardClassification), v))
            .WithMessage("Invalid classification.");
        RuleFor(c => c.MaxWeeklyHours).GreaterThan(0).LessThanOrEqualTo(76);
        RuleFor(c => c.VenueIds).NotEmpty();

        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
                !await uniquenessChecker.IsEmailTakenAsync(
                    tenantContext.OrganisationId, command.Email, command.StaffMemberId, ct))
            .WithMessage("A staff member with this email already exists.")
            .WithName("Email");

        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
                !await uniquenessChecker.IsPhoneTakenAsync(
                    tenantContext.OrganisationId, command.Phone, command.StaffMemberId, ct))
            .WithMessage("A staff member with this phone number already exists.")
            .WithName("Phone");
    }
}

public sealed class UpdateStaffMemberCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateStaffMemberCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(UpdateStaffMemberCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        if (request.VenueIds.Any(id => !tenantContext.AccessibleVenueIds.Contains(id)))
        {
            throw new ForbiddenAccessException("One or more venues are not accessible to the current manager.");
        }

        staff.UpdateProfile(
            request.Name,
            request.Email,
            request.Phone,
            (EmploymentType)request.EmploymentType,
            (AwardClassification)request.Classification,
            request.MaxWeeklyHours,
            request.VenueIds);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await staffLookup.GetStaffMemberAsync(staff.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Staff member '{staff.Id}' vanished immediately after being saved.");
    }
}
