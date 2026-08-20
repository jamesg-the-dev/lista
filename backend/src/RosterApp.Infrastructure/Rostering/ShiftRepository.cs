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
}
