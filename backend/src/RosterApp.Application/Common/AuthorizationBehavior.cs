using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// Second pipeline stage (tenant-scoping → authorization → audit →
/// validation — see project docs). The single enforcement point for
/// PermissionLevel-based access control: no ad-hoc PermissionLevel checks
/// belong in handlers, no [Authorize(Roles=...)] on controllers, no
/// permission checks in FluentValidation validators. Every MediatR
/// request implements exactly one of IRequiresPermissionLevel or
/// IPermitsSelfOrMinimumLevel — PermissionPolicyCoverageTests
/// (RosterApp.Application.Tests) fails the build if a request implements
/// neither (or both), so a new command can't silently ship without this
/// behavior having an explicit answer for it.
///
/// Also asserts ICurrentTenantContext.IsAuthenticated unconditionally, as
/// defense-in-depth alongside ASP.NET's [Authorize]/UseAuthorization and
/// TenantScopingBehavior's own IsAuthenticated checks — a request that
/// implements neither permission interface still needs *some* authenticated
/// caller, it just has no minimum tier.
/// </summary>
public sealed class AuthorizationBehavior<TRequest, TResponse>(ICurrentTenantContext tenantContext)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken
    )
    {
        if (!tenantContext.IsAuthenticated)
        {
            throw new ForbiddenAccessException("No authenticated tenant context.");
        }

        switch (request)
        {
            case IPermitsSelfOrMinimumLevel selfOrTier
                when tenantContext.StaffMemberId != selfOrTier.TargetStaffMemberId:
                if (tenantContext.PermissionLevel is not { } actualForOthers
                    || actualForOthers < selfOrTier.MinimumPermissionLevelForOthers)
                {
                    throw new ForbiddenAccessException(
                        $"Requires at least {selfOrTier.MinimumPermissionLevelForOthers} permission level to act on another staff member."
                    );
                }

                break;

            case IRequiresPermissionLevel tiered when tiered.MinimumPermissionLevel is { } required:
                if (tenantContext.PermissionLevel is not { } actual || actual < required)
                {
                    throw new ForbiddenAccessException(
                        $"Requires at least {required} permission level."
                    );
                }

                break;
        }

        return next();
    }
}
