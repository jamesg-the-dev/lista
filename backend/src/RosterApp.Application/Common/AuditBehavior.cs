using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// Third pipeline stage (tenant-scoping → authorization → audit →
/// validation). The actual append-only audit trail is written by
/// AuditSaveChangesInterceptor (Infrastructure layer), keyed off domain
/// events raised on aggregates during SaveChanges — not by this behavior.
/// This slot exists to hold the documented pipeline position and is where
/// request-level concerns (e.g. correlation-id stamping) would attach if
/// they're ever needed; currently a pass-through.
/// </summary>
public sealed class AuditBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
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
