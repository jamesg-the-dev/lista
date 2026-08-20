using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

public sealed record SwapRequestDto(
    Guid Id,
    Guid VenueId,
    Guid ShiftId,
    Guid RequestingStaffId,
    Guid? TargetStaffId,
    string? Reason,
    string Status,
    bool? TargetStaffAccepted,
    string? ManagerDecisionReason,
    DateTime CreatedAtUtc)
{
    public static SwapRequestDto FromDomain(SwapRequest swapRequest) => new(
        swapRequest.Id,
        swapRequest.VenueId,
        swapRequest.ShiftId,
        swapRequest.RequestingStaffId,
        swapRequest.TargetStaffId,
        swapRequest.Reason,
        swapRequest.Status.ToString(),
        swapRequest.TargetStaffAccepted,
        swapRequest.ManagerDecisionReason,
        swapRequest.CreatedAtUtc);
}
