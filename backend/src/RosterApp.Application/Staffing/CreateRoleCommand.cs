using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Creates the Role only — award classification mapping is a separate call
/// (SetRoleAwardMappingCommand, RosterApp.Application.AwardConfig). The
/// frontend's NewRoleDialog fires that call immediately afterwards only when
/// the venue already has an award configured and the owner picked a
/// classification; mapping is otherwise deferred and done later from the
/// role list or the Award &amp; Pay screen (§2 AC2 revised — mapping at
/// creation is no longer required or forced inline). Kept as two commands
/// rather than one combined "create with mapping" command so
/// RoleAwardMapping can keep being re-versioned independently of Role, per
/// Role's own doc comment.
/// </summary>
public sealed record CreateRoleCommand(Guid VenueId, string DisplayName, string? ColorTag)
    : IRequest<RoleDto>,
        IVenueScopedRequest,
        IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Owner;
}

public sealed class CreateRoleCommandValidator : AbstractValidator<CreateRoleCommand>
{
    public CreateRoleCommandValidator(IRoleUniquenessChecker uniquenessChecker)
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(c => c.ColorTag).MaximumLength(30);

        RuleFor(c => c)
            .MustAsync(
                async (command, ct) =>
                    !await uniquenessChecker.IsDisplayNameTakenAsync(
                        command.VenueId,
                        command.DisplayName,
                        null,
                        ct
                    )
            )
            .WithMessage("A role with this name already exists.")
            .WithName(nameof(CreateRoleCommand.DisplayName));
    }
}

public sealed class CreateRoleCommandHandler(
    IRoleRepository roleRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateRoleCommand, RoleDto>
{
    public async Task<RoleDto> Handle(
        CreateRoleCommand request,
        CancellationToken cancellationToken
    )
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("No authenticated tenant context.");
        }

        var role = Role.Create(
            request.VenueId,
            request.DisplayName,
            request.ColorTag,
            staffMemberId
        );

        roleRepository.Add(role);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return RoleDto.FromDomain(
            role,
            mappedAwardClassificationId: null,
            mappedAwardClassificationName: null,
            mappedAwardClassificationBaseHourlyRate: null
        );
    }
}
