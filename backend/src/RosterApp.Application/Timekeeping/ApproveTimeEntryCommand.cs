using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Manager-only. No IVenueScopedRequest — venue only known once the
/// TimeEntry is loaded, same pattern as ApproveSwapCommand.
/// </summary>
public sealed record ApproveTimeEntryCommand(Guid TimeEntryId) : IRequest<TimeEntryDto>, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class ApproveTimeEntryCommandHandler(
    ITimeEntryRepository timeEntryRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ApproveTimeEntryCommand, TimeEntryDto>
{
    public async Task<TimeEntryDto> Handle(ApproveTimeEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await timeEntryRepository.GetByIdAsync(request.TimeEntryId, cancellationToken);
        if (entry is null || !tenantContext.AccessibleVenueIds.Contains(entry.VenueId))
        {
            throw new NotFoundException($"Time entry '{request.TimeEntryId}' was not found.");
        }

        entry.Approve();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return TimeEntryDto.FromDomain(entry);
    }
}
