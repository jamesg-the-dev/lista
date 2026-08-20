using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RosterApp.Application.Common;

namespace RosterApp.Api.Common;

/// <summary>
/// Translates exceptions from the MediatR pipeline into the ApiResponse
/// envelope instead of the default ASP.NET Core problem-details page.
/// ForbiddenAccessException (tenant-scoping) and FluentValidation's
/// ValidationException (validation stage) are the two pipeline-raised
/// exceptions that need specific status codes. DbUpdateException wrapping a
/// Postgres unique-violation is the race-condition backstop for a
/// uniqueness rule already checked async in validation (e.g.
/// StaffMember's per-organisation email/phone uniqueness — see
/// IStaffUniquenessChecker) — two concurrent requests can both pass that
/// check before either saves. Everything else is a 500.
/// </summary>
public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, error) = exception switch
        {
            ForbiddenAccessException forbidden => (
                StatusCodes.Status403Forbidden,
                new ApiError("forbidden", forbidden.Message)),

            NotFoundException notFound => (
                StatusCodes.Status404NotFound,
                new ApiError("not_found", notFound.Message)),

            ValidationException validation => (
                StatusCodes.Status400BadRequest,
                new ApiError(
                    "validation_failed",
                    "One or more validation errors occurred.",
                    validation.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))),

            DbUpdateException dbUpdate when TryGetUniqueViolationMessage(dbUpdate, out var message) => (
                StatusCodes.Status409Conflict,
                new ApiError("conflict", message)),

            _ => (StatusCodes.Status500InternalServerError, new ApiError("internal_error", "An unexpected error occurred.")),
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception processing {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(error), cancellationToken);
        return true;
    }

    private static bool TryGetUniqueViolationMessage(DbUpdateException exception, out string message)
    {
        if (exception.InnerException is not PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } pgException)
        {
            message = "";
            return false;
        }

        message = pgException.ConstraintName switch
        {
            "IX_StaffMembers_OrganisationId_Email" => "A staff member with this email already exists.",
            "IX_StaffMembers_OrganisationId_Phone" => "A staff member with this phone number already exists.",
            _ => "This record conflicts with an existing one.",
        };
        return true;
    }
}
