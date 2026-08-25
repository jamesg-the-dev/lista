using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

public sealed record DuplicateRosterCommand(
    Guid VenueId,
    DateOnly SourceWeekStart,
    DateOnly TargetWeekStart
) : IRequest<IReadOnlyList<ShiftDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class DuplicateRosterCommandValidator : AbstractValidator<DuplicateRosterCommand>
{
    public DuplicateRosterCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.TargetWeekStart)
            .NotEqual(c => c.SourceWeekStart)
            .WithMessage("Target week must be different from the source week.");
    }
}

/// <summary>
/// Clones a week's shifts as new Draft shifts on a new set of dates —
/// staff/availability data is never touched (see CLAUDE.md build order step
/// 3, "Shift templates / copy-previous-week"). Award breakdown and
/// compliance violations are re-run per clone rather than copied verbatim,
/// since the target dates can land on different days of the week and a
/// different staff-member context. Does not check whether the target week
/// already has shifts — duplicating onto a populated week is additive, not
/// a merge/overwrite.
/// </summary>
public sealed class DuplicateRosterCommandHandler(
    IRosterLookup rosterLookup,
    IAwardRateCalculator awardRateCalculator,
    IRosterComplianceValidator complianceValidator,
    IRosterComplianceThresholdsLookup complianceThresholdsLookup,
    IStaffLookup staffLookup,
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<DuplicateRosterCommand, IReadOnlyList<ShiftDto>>
{
    // Same context window as CreateShiftCommandHandler — see the comment there.
    private const int ComplianceContextDays = 8;

    public async Task<IReadOnlyList<ShiftDto>> Handle(
        DuplicateRosterCommand request,
        CancellationToken cancellationToken
    )
    {
        var sourceShifts = await rosterLookup.GetRosterForWeekAsync(
            request.VenueId,
            request.SourceWeekStart,
            cancellationToken
        );

        var thresholds = await complianceThresholdsLookup.GetActiveThresholdsAsync(
            request.VenueId,
            cancellationToken
        );

        // Cached per employee — a week's roster commonly rosters the same
        // employee across several shifts, and EmploymentType doesn't change
        // mid-duplication.
        var employmentTypeByEmployeeId = new Dictionary<Guid, EmploymentType>();

        var offsetDays = request.TargetWeekStart.DayNumber - request.SourceWeekStart.DayNumber;
        var createdShifts = new List<Shift>();

        foreach (var source in sourceShifts)
        {
            var targetDate = source.ShiftDate.AddDays(offsetDays);

            if (!employmentTypeByEmployeeId.TryGetValue(source.EmployeeId, out var employmentType))
            {
                var employee =
                    await staffLookup.GetStaffMemberAsync(source.EmployeeId, cancellationToken)
                    ?? throw new NotFoundException(
                        $"Staff member '{source.EmployeeId}' was not found."
                    );
                employmentType = Enum.Parse<EmploymentType>(employee.EmploymentType);
                employmentTypeByEmployeeId[source.EmployeeId] = employmentType;
            }

            var awardBreakdown = awardRateCalculator.Calculate(
                targetDate.DayOfWeek,
                source.Start,
                source.End,
                source.UnpaidBreakMinutes,
                source.BaseRatePerHour,
                employmentType
            );

            var shift = Shift.Create(
                request.VenueId,
                source.EmployeeId,
                targetDate,
                source.Start,
                source.End,
                source.UnpaidBreakMinutes,
                source.BaseRatePerHour,
                awardBreakdown
            );

            // Adjacent shifts created earlier in this same loop iteration
            // aren't visible here yet (not saved until the loop completes) —
            // a compliance conflict purely among the duplicated shifts
            // themselves surfaces once the roster is reloaded or next edited,
            // not immediately on duplication.
            var adjacentShifts = await rosterLookup.GetShiftsForEmployeeAsync(
                source.EmployeeId,
                targetDate.AddDays(-ComplianceContextDays),
                targetDate.AddDays(ComplianceContextDays),
                excludeShiftId: null,
                cancellationToken
            );

            var violations = await complianceValidator.ValidateAsync(
                shift,
                adjacentShifts,
                thresholds,
                cancellationToken
            );
            shift.SetComplianceViolations(violations);

            shiftRepository.Add(shift);
            createdShifts.Add(shift);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return createdShifts.Select(ShiftDto.FromDomain).ToList();
    }
}
