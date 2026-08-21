using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Never updates RoleAwardMapping in place — same supersede-then-create
/// pattern as UpdateAwardConfigurationCommand, per
/// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §3/§5. Fired by the frontend
/// immediately after CreateRoleCommand succeeds (NewRoleDialog's
/// non-skippable award-mapping step, §2 AC2) and again any time an owner
/// re-maps an existing role from the Award &amp; Pay screen's
/// RoleAwardMappingTable.
/// </summary>
public sealed record SetRoleAwardMappingCommand(Guid VenueId, Guid RoleId, Guid AwardClassificationId)
    : IRequest<RoleAwardMappingDto>, IVenueScopedRequest;

public sealed class SetRoleAwardMappingCommandValidator : AbstractValidator<SetRoleAwardMappingCommand>
{
    public SetRoleAwardMappingCommandValidator(IAwardReferenceDataLookup referenceDataLookup)
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.RoleId).NotEmpty();

        RuleFor(c => c.AwardClassificationId)
            .NotEmpty()
            .MustAsync(async (classificationId, ct) => await referenceDataLookup.ClassificationExistsAsync(classificationId, ct))
            .WithMessage("Selected award classification does not exist.");
    }
}

public sealed class SetRoleAwardMappingCommandHandler(
    IRoleAwardMappingRepository repository,
    IRoleRepository roleRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<SetRoleAwardMappingCommand, RoleAwardMappingDto>
{
    public async Task<RoleAwardMappingDto> Handle(SetRoleAwardMappingCommand request, CancellationToken cancellationToken)
    {
        var role = await roleRepository.GetByIdAsync(request.RoleId, cancellationToken);
        if (role is null || role.VenueId != request.VenueId)
        {
            throw new NotFoundException($"Role '{request.RoleId}' was not found for venue '{request.VenueId}'.");
        }

        var currentMapping = await repository.GetActiveByRoleIdAsync(request.RoleId, cancellationToken);

        var newMapping = RoleAwardMapping.CreateNewVersion(
            request.VenueId,
            request.RoleId,
            request.AwardClassificationId,
            tenantContext.ManagerId);

        currentMapping?.Supersede(DateTime.UtcNow);
        repository.Add(newMapping);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return RoleAwardMappingDto.FromDomain(newMapping);
    }
}
