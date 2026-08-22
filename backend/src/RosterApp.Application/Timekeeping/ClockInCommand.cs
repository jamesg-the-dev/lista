using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Timekeeping;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Staff-initiated, not manager-initiated — StaffId comes from
/// ICurrentTenantContext.StaffMemberId, not the request body, so a staff
/// member can only ever clock themselves in. No IVenueScopedRequest — the
/// venue is only known once the Shift is loaded, same pattern as
/// RequestSwapCommand.
/// </summary>
public sealed record ClockInCommand(Guid ShiftId, decimal Latitude, decimal Longitude, decimal AccuracyMetres)
    : IRequest<TimeEntryDto>, IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class ClockInCommandValidator : AbstractValidator<ClockInCommand>
{
    public ClockInCommandValidator()
    {
        RuleFor(c => c.ShiftId).NotEmpty();
        RuleFor(c => c.Latitude).InclusiveBetween(-90m, 90m);
        RuleFor(c => c.Longitude).InclusiveBetween(-180m, 180m);
        RuleFor(c => c.AccuracyMetres).GreaterThanOrEqualTo(0);
    }
}

public sealed class ClockInCommandHandler(
    IShiftRepository shiftRepository,
    ITimeEntryRepository timeEntryRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ClockInCommand, TimeEntryDto>
{
    public async Task<TimeEntryDto> Handle(ClockInCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("Only an authenticated staff member can clock in.");
        }

        var shift = await shiftRepository.GetByIdAsync(request.ShiftId, cancellationToken);
        if (shift is null || shift.EmployeeId != staffMemberId)
        {
            // Not-found rather than forbidden even for "the shift exists but
            // isn't mine" — same existence-leak rationale as NotFoundException's
            // doc comment.
            throw new NotFoundException($"Shift '{request.ShiftId}' was not found.");
        }

        var openEntry = await timeEntryRepository.GetOpenEntryForShiftAsync(request.ShiftId, cancellationToken);
        if (openEntry is not null)
        {
            throw new InvalidOperationException($"Shift '{request.ShiftId}' already has an open time entry.");
        }

        var entry = TimeEntry.ClockIn(shift.VenueId, shift.Id, staffMemberId, request.Latitude, request.Longitude, request.AccuracyMetres);
        timeEntryRepository.Add(entry);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return TimeEntryDto.FromDomain(entry);
    }
}
