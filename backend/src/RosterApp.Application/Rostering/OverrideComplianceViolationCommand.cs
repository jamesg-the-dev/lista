using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

public sealed record OverrideComplianceViolationCommand(
    Guid ShiftId,
    Guid VenueId,
    string ViolationType,
    string Reason
) : IRequest<ShiftDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

/// <summary>
/// ViolationType arrives as the exact enum member name string (see
/// ShiftDto/ComplianceViolationDto's wire convention) and is validated
/// against the enum's defined names via EnumWireValidation — same pattern
/// as CreateStaffMemberCommandValidator's EmploymentType/Classification
/// checks.
/// </summary>
public sealed class OverrideComplianceViolationCommandValidator : AbstractValidator<OverrideComplianceViolationCommand>
{
    public OverrideComplianceViolationCommandValidator()
    {
        RuleFor(c => c.ShiftId).NotEmpty();
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.ViolationType)
            .Must(EnumWireValidation.IsDefinedName<ComplianceViolationType>)
            .WithMessage("Invalid violation type.");
        RuleFor(c => c.Reason)
            .NotEmpty()
            .WithMessage("An override reason is required to acknowledge a compliance violation.");
    }
}

/// <summary>
/// Writes the audit-logged override record via Shift's
/// ComplianceViolationOverridden domain event (picked up by
/// AuditSaveChangesInterceptor, same as every other Shift event) rather than
/// a bespoke audit write here — see CLAUDE.md build order step 3.
/// </summary>
public sealed class OverrideComplianceViolationCommandHandler(
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<OverrideComplianceViolationCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(OverrideComplianceViolationCommand request, CancellationToken cancellationToken)
    {
        var shift = await shiftRepository.GetByIdAsync(request.ShiftId, cancellationToken);
        if (shift is null || shift.VenueId != request.VenueId)
        {
            throw new NotFoundException($"Shift '{request.ShiftId}' was not found.");
        }

        var violationType = Enum.Parse<ComplianceViolationType>(request.ViolationType);

        var hasOutstandingViolation = shift.ComplianceViolations
            .Any(v => v.Type == violationType && !v.Acknowledged);
        if (!hasOutstandingViolation)
        {
            throw new NotFoundException(
                $"Shift '{request.ShiftId}' has no outstanding compliance violation of type '{violationType}'.");
        }

        shift.AcknowledgeComplianceViolation(violationType, request.Reason);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
