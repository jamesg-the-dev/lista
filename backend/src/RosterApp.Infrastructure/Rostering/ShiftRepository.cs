using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.Rostering;

public sealed class ShiftRepository(RosterDbContext dbContext) : IShiftRepository
{
    public Task<Shift?> GetByIdAsync(Guid shiftId, CancellationToken cancellationToken) =>
        dbContext.Shifts.FirstOrDefaultAsync(s => s.Id == shiftId, cancellationToken);

    public void Add(Shift shift) => dbContext.Shifts.Add(shift);

    public void Remove(Shift shift) => dbContext.Shifts.Remove(shift);

    public Task<bool> HasFuturePublishedShiftsAsync(Guid venueId, DateOnly onOrAfter, CancellationToken cancellationToken) =>
        dbContext.Shifts.AnyAsync(
            s => s.VenueId == venueId && s.ShiftDate >= onOrAfter && s.Status == ShiftStatus.Published,
            cancellationToken);

    public Task<bool> HasFuturePublishedShiftsForStaffMemberAsync(Guid staffMemberId, DateOnly onOrAfter, CancellationToken cancellationToken) =>
        dbContext.Shifts.AnyAsync(
            s => s.EmployeeId == staffMemberId && s.ShiftDate >= onOrAfter && s.Status == ShiftStatus.Published,
            cancellationToken);
}
