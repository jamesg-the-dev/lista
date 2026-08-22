using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Not named in docs/backend-step-by-step.md's Phase 5 route table, but a
/// necessary supporting piece for it: CLAUDE.md's stack decisions say
/// "Supabase Auth handles manager/staff login," and every authenticated
/// actor is a StaffMember row — without a link step, GetMyShiftsQuery and
/// every other "current staff member" endpoint in this phase has no
/// identity to resolve for a staff member who wasn't the one who created
/// their own row (i.e. anyone below Owner/Manager tier).
///
/// Flow: a manager creates the StaffMember profile (Phase 2) with the
/// staff member's email; the staff member later signs up for the staff app
/// via Supabase Auth using that same email and calls this once, which
/// matches their new Supabase account to the pre-existing profile by email
/// and links it (see SupabaseClaimsTransformation for the read side of this
/// link). Takes no parameters — both the Supabase user id and email come
/// from the caller's own validated JWT via ICurrentTenantContext, so a
/// staff member can only ever link their own account.
/// </summary>
public sealed record LinkStaffSupabaseAccountCommand : IRequest<StaffMemberDto>;

public sealed class LinkStaffSupabaseAccountCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<LinkStaffSupabaseAccountCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(LinkStaffSupabaseAccountCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.SupabaseUserId is not { } supabaseUserId || tenantContext.Email is not { } email)
        {
            throw new ForbiddenAccessException("No authenticated Supabase user to link.");
        }

        var alreadyLinked = await staffMemberRepository.GetBySupabaseUserIdAsync(supabaseUserId, cancellationToken);
        if (alreadyLinked is not null)
        {
            var existing = await staffLookup.GetStaffMemberAsync(alreadyLinked.Id, cancellationToken);
            return existing ?? throw new NotFoundException($"Staff member '{alreadyLinked.Id}' was not found.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var staff = await staffMemberRepository.GetUnlinkedByEmailAsync(normalizedEmail, cancellationToken);
        if (staff is null)
        {
            throw new NotFoundException("No staff profile was found for this account's email. Ask your manager to add you first.");
        }

        staff.LinkSupabaseAccount(supabaseUserId);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var linked = await staffLookup.GetStaffMemberAsync(staff.Id, cancellationToken);
        return linked ?? throw new NotFoundException($"Staff member '{staff.Id}' was not found.");
    }
}
