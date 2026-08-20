namespace RosterApp.Application.Common;

/// <summary>
/// Thrown when a command/query targets an aggregate that doesn't exist, or
/// that exists but outside the request's venue scope — the latter is
/// treated as not-found rather than forbidden so cross-tenant existence
/// isn't leaked to the caller. Mapped to 404 by the Api layer's
/// exception-handling middleware.
/// </summary>
public sealed class NotFoundException(string message) : Exception(message);
