using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

/// <summary>
/// Monday=0..Sunday=6, matching the frontend's day encoding (see
/// frontend/app/routes/staff/types.ts DAY_LABELS) rather than C#'s native
/// DayOfWeek (Sunday=0). Convert explicitly at any boundary that touches
/// System.DayOfWeek (e.g. Shift.ShiftDate.DayOfWeek in
/// IStaffAvailabilityChecker) — never assume the two line up.
/// </summary>
public enum Weekday
{
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday,
}

/// <summary>
/// Morning/afternoon/evening are deliberately undefined as exact time
/// ranges — this is a coarse standing-availability signal for the roster
/// builder UI, not a precise time-block scheduler. IStaffAvailabilityChecker
/// (double-booking guard on CreateShiftCommand/UpdateShiftCommand) only
/// acts on IsAllDay exceptions for this reason; per-block-vs-shift-time
/// matching would need those ranges formally defined first.
/// </summary>
public enum AvailabilityBlock
{
    Morning,
    Afternoon,
    Evening,
}

/// <summary>
/// Aggregate root for one day's standing unavailability exception —
/// "default available unless excepted" per CLAUDE.md build order step 2.
/// One row per (StaffMemberId, DayOfWeek) — enforced by a unique index in
/// StandingUnavailabilityConfiguration, not just handler-level upsert logic
/// in SetStandingUnavailabilityCommand. Kept as its own aggregate root
/// (not an owned collection on StaffMember) per docs/backend-step-by-step.md
/// Phase 2's aggregate list, since it has its own lifecycle (add/replace/
/// remove independent of the rest of the profile) and audit trail.
/// </summary>
public sealed class StandingUnavailability : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid StaffMemberId { get; private set; }
    public Weekday DayOfWeek { get; private set; }
    public bool IsAllDay { get; private set; }

    // Flattened to three plain columns rather than a List<AvailabilityBlock>
    // collection — there are only ever three possible blocks, and EF Core
    // 9's "primitive collections" feature fails to scaffold migrations in
    // this project's EF Core/Npgsql tooling combo ("Cannot scaffold C#
    // literals of type System.Reflection.NullabilityInfoContext"). Blocks
    // is the public view; storage shape is an implementation detail, same
    // spirit as Shift exposing IReadOnlyList<T> over a private backing list.
    public bool IncludesMorning { get; private set; }
    public bool IncludesAfternoon { get; private set; }
    public bool IncludesEvening { get; private set; }

    public IReadOnlyList<AvailabilityBlock> Blocks
    {
        get
        {
            var blocks = new List<AvailabilityBlock>();
            if (IncludesMorning)
            {
                blocks.Add(AvailabilityBlock.Morning);
            }

            if (IncludesAfternoon)
            {
                blocks.Add(AvailabilityBlock.Afternoon);
            }

            if (IncludesEvening)
            {
                blocks.Add(AvailabilityBlock.Evening);
            }

            return blocks;
        }
    }

    private StandingUnavailability() { } // EF Core

    public static StandingUnavailability Create(
        Guid staffMemberId,
        Weekday dayOfWeek,
        bool isAllDay,
        IReadOnlyList<AvailabilityBlock> blocks)
    {
        var unavailability = new StandingUnavailability
        {
            Id = Guid.NewGuid(),
            StaffMemberId = staffMemberId,
            DayOfWeek = dayOfWeek,
            IsAllDay = isAllDay,
        };

        if (!isAllDay)
        {
            unavailability.SetBlocks(blocks);
        }

        unavailability.AddDomainEvent(new StandingUnavailabilitySet(unavailability.Id, staffMemberId, DateTime.UtcNow));

        return unavailability;
    }

    public void Update(bool isAllDay, IReadOnlyList<AvailabilityBlock> blocks)
    {
        IsAllDay = isAllDay;
        SetBlocks(isAllDay ? [] : blocks);

        AddDomainEvent(new StandingUnavailabilitySet(Id, StaffMemberId, DateTime.UtcNow));
    }

    public void MarkForRemoval()
    {
        AddDomainEvent(new StandingUnavailabilityRemoved(Id, StaffMemberId, DateTime.UtcNow));
    }

    private void SetBlocks(IReadOnlyList<AvailabilityBlock> blocks)
    {
        IncludesMorning = blocks.Contains(AvailabilityBlock.Morning);
        IncludesAfternoon = blocks.Contains(AvailabilityBlock.Afternoon);
        IncludesEvening = blocks.Contains(AvailabilityBlock.Evening);
    }
}
