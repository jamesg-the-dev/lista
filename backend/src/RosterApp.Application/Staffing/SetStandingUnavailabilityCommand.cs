using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Upserts the exception for (StaffMemberId, DayOfWeek) — one row per day,
/// enforced by a unique index in StandingUnavailabilityConfiguration.
/// "Set" (not "Add") because a weekly standing pattern only makes sense
/// with a single exception per day; POSTing again for the same day replaces
/// it rather than creating a second row.
/// </summary>
public sealed record SetStandingUnavailabilityCommand(
    Guid StaffMemberId,
    int DayOfWeek,
    bool IsAllDay,
    IReadOnlyList<int> Blocks
) : IRequest<AvailabilityExceptionDto>;

public sealed class SetStandingUnavailabilityCommandValidator : AbstractValidator<SetStandingUnavailabilityCommand>
{
    public SetStandingUnavailabilityCommandValidator()
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
        RuleFor(c => c.DayOfWeek).Must(v => Enum.IsDefined(typeof(Weekday), v))
            .WithMessage("Invalid day of week.");
        RuleForEach(c => c.Blocks).Must(v => Enum.IsDefined(typeof(AvailabilityBlock), v))
            .WithMessage("Invalid availability block.");
    }
}

public sealed class SetStandingUnavailabilityCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStandingUnavailabilityRepository unavailabilityRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<SetStandingUnavailabilityCommand, AvailabilityExceptionDto>
{
    public async Task<AvailabilityExceptionDto> Handle(SetStandingUnavailabilityCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        var dayOfWeek = (Weekday)request.DayOfWeek;
        var blocks = request.Blocks.Select(b => (AvailabilityBlock)b).ToList();

        var existing = await unavailabilityRepository.GetByStaffAndDayAsync(request.StaffMemberId, dayOfWeek, cancellationToken);
        if (existing is not null)
        {
            existing.Update(request.IsAllDay, blocks);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return AvailabilityExceptionDto.FromDomain(existing);
        }

        var created = StandingUnavailability.Create(request.StaffMemberId, dayOfWeek, request.IsAllDay, blocks);
        unavailabilityRepository.Add(created);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return AvailabilityExceptionDto.FromDomain(created);
    }
}
