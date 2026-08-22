using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

public sealed record TradingHourSessionInput(
    string DayOfWeek,
    string? SessionLabel,
    TimeOnly? OpenTime,
    TimeOnly? CloseTime,
    bool IsClosed,
    bool CrossesMidnight
);

/// <summary>Replaces the full week's sessions in one call — simpler than a per-day patch endpoint.</summary>
public sealed record UpdateVenueTradingHoursCommand(Guid VenueId, IReadOnlyList<TradingHourSessionInput> Sessions)
    : IRequest<VenueDto>, IVenueScopedRequest, RosterApp.Application.Common.IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Manager;
}

public sealed class UpdateVenueTradingHoursCommandValidator : AbstractValidator<UpdateVenueTradingHoursCommand>
{
    public UpdateVenueTradingHoursCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();

        RuleForEach(c => c.Sessions).ChildRules(session =>
        {
            session.RuleFor(s => s.DayOfWeek)
                .Must(EnumWireValidation.IsDefinedName<System.DayOfWeek>)
                .WithMessage("Invalid day of week.");

            session.RuleFor(s => s.OpenTime)
                .NotNull()
                .When(s => !s.IsClosed)
                .WithMessage("Open time is required unless the day is closed.");

            session.RuleFor(s => s.CloseTime)
                .NotNull()
                .When(s => !s.IsClosed)
                .WithMessage("Close time is required unless the day is closed.");

            session.RuleFor(s => s)
                .Must(s => s.CloseTime > s.OpenTime)
                .When(s => !s.IsClosed && !s.CrossesMidnight && s.OpenTime.HasValue && s.CloseTime.HasValue)
                .WithMessage("Close time must be after open time (or mark the session as crossing midnight).");

            session.RuleFor(s => s)
                .Must(s => s.CloseTime < s.OpenTime)
                .When(s => !s.IsClosed && s.CrossesMidnight && s.OpenTime.HasValue && s.CloseTime.HasValue)
                .WithMessage("A session crossing midnight must have a close time before its open time.");
        });
    }
}

public sealed class UpdateVenueTradingHoursCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateVenueTradingHoursCommand, VenueDto>
{
    public async Task<VenueDto> Handle(UpdateVenueTradingHoursCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        var sessions = request.Sessions.Select(s => new TradingHourSession(
            Enum.Parse<System.DayOfWeek>(s.DayOfWeek),
            s.SessionLabel,
            s.OpenTime,
            s.CloseTime,
            s.IsClosed,
            s.CrossesMidnight));

        venue.UpdateTradingHours(sessions);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
