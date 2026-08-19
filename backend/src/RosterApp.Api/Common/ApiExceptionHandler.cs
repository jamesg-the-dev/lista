using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using RosterApp.Application.Common;

namespace RosterApp.Api.Common;

/// <summary>
/// Translates exceptions from the MediatR pipeline into the ApiResponse
/// envelope instead of the default ASP.NET Core problem-details page.
/// ForbiddenAccessException (tenant-scoping) and FluentValidation's
/// ValidationException (validation stage) are the two pipeline-raised
/// exceptions that need specific status codes; everything else is a 500.
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

            ValidationException validation => (
                StatusCodes.Status400BadRequest,
                new ApiError(
                    "validation_failed",
                    "One or more validation errors occurred.",
                    validation.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))),

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
}
