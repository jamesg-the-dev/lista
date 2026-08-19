namespace RosterApp.Api.Common;

/// <summary>
/// Consistent response envelope for every endpoint, success and error
/// alike — locked-in decision over raw DTOs + problem-details.
/// </summary>
public sealed record ApiResponse<T>(bool Success, T? Data, ApiError? Error)
{
    public static ApiResponse<T> Ok(T data) => new(true, data, null);
    public static ApiResponse<T> Fail(ApiError error) => new(false, default, error);
}

public sealed record ApiError(string Code, string Message, IReadOnlyDictionary<string, string[]>? Details = null);
