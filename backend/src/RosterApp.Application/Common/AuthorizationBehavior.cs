using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// Second pipeline stage (tenant-scoping → authorization → audit →
/// validation). Currently a pass-through: MVP has a single "Manager" role
/// and coarse authentication is already enforced by ASP.NET's
/// [Authorize]/UseAuthorization before a request reaches MediatR at all.
/// This is the extension point for per-command permission checks once a
/// finer-grained role/permission model exists — deliberately not built out
/// further until there's a real second role to check against.
/// </summary>
public sealed class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return next();
    }
}
