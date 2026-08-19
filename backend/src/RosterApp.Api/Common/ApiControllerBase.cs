using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace RosterApp.Api.Common;

/// <summary>
/// Every controller is a thin pass-through to MediatR — no logic here
/// beyond sending the request and wrapping the result in ApiResponse.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase(ISender mediator) : ControllerBase
{
    protected readonly ISender Mediator = mediator;
}
