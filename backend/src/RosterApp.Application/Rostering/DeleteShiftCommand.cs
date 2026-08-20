using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Rostering;

public sealed record DeleteShiftCommand(Guid ShiftId, Guid VenueId) : IRequest, IVenueScopedRequest;

public sealed class DeleteShiftCommandHandler(
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<DeleteShiftCommand>
{
    public async Task Handle(DeleteShiftCommand request, CancellationToken cancellationToken)
    {
        var shift = await shiftRepository.GetByIdAsync(request.ShiftId, cancellationToken);
        if (shift is null || shift.VenueId != request.VenueId)
        {
            throw new NotFoundException($"Shift '{request.ShiftId}' was not found.");
        }

        shift.MarkForDeletion();
        shiftRepository.Remove(shift);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
