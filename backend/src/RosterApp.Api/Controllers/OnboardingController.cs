using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Tenancy;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Onboarding sign-up bootstrap (FEATURE_ONBOARDING_FLOW.md Phase 1).
/// [Authorize] still applies — the frontend calls Supabase Auth directly to
/// create the login (supabase.auth.signUp / signInWithOAuth) and only calls
/// this endpoint once it holds a valid Supabase JWT, which is all
/// SignUpCommand requires (see its MinimumPermissionLevel doc comment).
/// </summary>
[Authorize]
public sealed class OnboardingController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpPost("~/api/onboarding/sign-up")]
    public async Task<ActionResult<ApiResponse<SignUpResultDto>>> SignUp(
        SignUpRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await Mediator.Send(
            new SignUpCommand(request.FullName, request.VenueName),
            cancellationToken
        );
        return Ok(ApiResponse<SignUpResultDto>.Ok(result));
    }
}

public sealed record SignUpRequest(string FullName, string VenueName);
