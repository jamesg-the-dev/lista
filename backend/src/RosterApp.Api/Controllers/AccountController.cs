using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Account;

namespace RosterApp.Api.Controllers;

[Authorize]
public sealed class AccountController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Resolves the current Supabase user to their internal identity and
    /// accessible venues. Smoke test for the whole Phase 0 pipeline.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<AccountDto>>> GetMe(CancellationToken cancellationToken)
    {
        var account = await Mediator.Send(new GetCurrentAccountQuery(), cancellationToken);
        return Ok(ApiResponse<AccountDto>.Ok(account));
    }
}
