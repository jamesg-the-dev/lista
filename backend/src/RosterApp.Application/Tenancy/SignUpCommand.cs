using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Onboarding sign-up bootstrap (FEATURE_ONBOARDING_FLOW.md Phase 1) — the
/// one command that creates an Organisation from nothing. Deliberately
/// implements neither IVenueScopedRequest nor IOrganisationScopedRequest
/// (there's no venue/org yet for TenantScopingBehavior to check against,
/// same reasoning as CreateVenueCommand/GetCurrentAccountQuery) and sets
/// MinimumPermissionLevel to null, same as LinkStaffSupabaseAccountCommand
/// — the caller only needs a valid Supabase JWT (sub/email claims), not a
/// resolved StaffMember/PermissionLevel, since neither exists yet for a
/// brand-new signup. The Supabase account itself (creating the login) is a
/// frontend-only step against Supabase Auth directly; this command only
/// runs once that JWT exists.
///
/// FullName/Email/VenueName is the full onboarding sign-up field set minus
/// password (handled entirely by Supabase Auth, never seen by this API).
/// For an SSO signup, the frontend infers FullName from the provider's
/// profile instead of asking for it — this command has no notion of
/// SSO vs password, it just takes whatever name the frontend resolved.
///
/// Assumption (flagged per FEATURE_ONBOARDING_FLOW.md's ambiguity-flagging
/// instruction): the spec's sign-up form collects a single "venue name"
/// field, not a separate organisation name — there is no MVP concept of a
/// multi-venue signup at trial creation, so the new Organisation is named
/// after the venue. A manager can rename either independently later via
/// existing settings.
/// </summary>
public sealed record SignUpCommand(string FullName, string VenueName)
    : IRequest<SignUpResultDto>,
        IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => null;
}

public sealed record SignUpResultDto(Guid OrganisationId, Guid VenueId, Guid StaffMemberId);

public sealed class SignUpCommandValidator : AbstractValidator<SignUpCommand>
{
    public SignUpCommandValidator()
    {
        RuleFor(c => c.FullName).NotEmpty().MaximumLength(200);
        RuleFor(c => c.VenueName).NotEmpty().MaximumLength(200);
    }
}

public sealed class SignUpCommandHandler(
    IOrganisationRepository organisationRepository,
    IVenueRepository venueRepository,
    IStaffMemberRepository staffMemberRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<SignUpCommand, SignUpResultDto>
{
    // Onboarding collects no phone/DOB/classification for the owner — those
    // are real StaffMember fields required by the domain (DOB drives minor
    // rostering rules, classification drives award rate). Filled with a
    // syntactically valid placeholder here so the owner can complete
    // profile details later via their own Staff Profile edit form, same
    // "placeholder now, real data later" philosophy the spec applies to
    // Card 3's skipped staff. Assumption flagged per
    // FEATURE_ONBOARDING_FLOW.md — the spec doesn't say what to do about
    // StaffMember's other required fields since sign-up only collects name/
    // email/password/venue name.
    private static readonly string PlaceholderMobile = "0400000000";
    private static readonly DateOnly PlaceholderDateOfBirth = new(1990, 1, 1);

    public async Task<SignUpResultDto> Handle(
        SignUpCommand request,
        CancellationToken cancellationToken
    )
    {
        if (
            tenantContext.SupabaseUserId is not { } supabaseUserId
            || tenantContext.Email is not { } email
        )
        {
            throw new ForbiddenAccessException("No authenticated Supabase user to sign up.");
        }

        // Idempotent: a retried/duplicate call (e.g. a refreshed sign-up
        // page after the first call already succeeded) returns the
        // existing org/venue instead of creating a second one.
        var existing = await staffMemberRepository.GetBySupabaseUserIdAsync(
            supabaseUserId,
            cancellationToken
        );
        if (existing is not null)
        {
            return new SignUpResultDto(
                existing.OrganisationId,
                existing.VenueIds.FirstOrDefault(),
                existing.Id
            );
        }

        var organisation = Organisation.Create(request.VenueName);
        organisationRepository.Add(organisation);

        var owner = StaffMember.Create(
            organisation.Id,
            request.FullName,
            email,
            PlaceholderMobile,
            PlaceholderDateOfBirth,
            EmploymentType.FullTime,
            AwardClassification.Level1,
            maxWeeklyHours: 38,
            venueIds: [],
            PermissionLevel.Owner,
            primaryRoleId: null
        );
        owner.LinkSupabaseAccount(supabaseUserId);
        staffMemberRepository.Add(owner);

        var venue = Venue.CreateBootstrap(organisation.Id, request.VenueName, owner.Id);
        venueRepository.Add(venue);

        // StaffMember.Create above ran before the venue existed, so the
        // owner's own venue assignment is added via the same UpdateProfile
        // path CreateStaffMemberCommand's callers use for editing one —
        // there's no separate "assign venue" domain method to reuse
        // instead.
        owner.UpdateProfile(
            request.FullName,
            email,
            PlaceholderMobile,
            PlaceholderDateOfBirth,
            EmploymentType.FullTime,
            AwardClassification.Level1,
            maxWeeklyHours: 38,
            venueIds: [venue.Id],
            primaryRoleId: null
        );

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new SignUpResultDto(organisation.Id, venue.Id, owner.Id);
    }
}
