using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Write-side port for the StaffMember aggregate, same split as
/// IShiftRepository/IRosterLookup in Rostering — read-heavy queries go
/// through IStaffLookup instead.
/// </summary>
public interface IStaffMemberRepository
{
    Task<StaffMember?> GetByIdAsync(Guid staffMemberId, CancellationToken cancellationToken);
    void Add(StaffMember staffMember);

    /// <summary>
    /// Backs LinkStaffSupabaseAccountCommand's idempotency check — a repeat
    /// call from the same already-linked Supabase account returns the
    /// existing link rather than failing.
    /// </summary>
    Task<StaffMember?> GetBySupabaseUserIdAsync(string supabaseUserId, CancellationToken cancellationToken);

    /// <summary>
    /// Backs LinkStaffSupabaseAccountCommand's match step — finds the
    /// profile a manager already created for this email that hasn't been
    /// claimed by a Supabase login yet. Email is matched via
    /// StaffMember.Email, which is already normalized (trimmed/lowercased)
    /// on write — see StaffMember.Create/UpdateProfile.
    /// </summary>
    Task<StaffMember?> GetUnlinkedByEmailAsync(string normalizedEmail, CancellationToken cancellationToken);
}
