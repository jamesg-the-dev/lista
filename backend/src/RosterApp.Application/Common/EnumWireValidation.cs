namespace RosterApp.Application.Common;

/// <summary>
/// Shared FluentValidation predicate for enum wire fields. Every enum
/// crosses the API boundary as its exact member name string, matching how
/// Postgres stores it (see the Configurations' HasConversion&lt;string&gt;())
/// — never as a number, and never case-insensitively. Enum.TryParse alone
/// isn't safe here: it silently accepts numeric strings like "2" even when
/// nothing named "2" is defined, so this checks membership against
/// Enum.GetNames directly instead.
/// </summary>
public static class EnumWireValidation
{
    public static bool IsDefinedName<TEnum>(string? value)
        where TEnum : struct, Enum => value is not null && Enum.GetNames<TEnum>().Contains(value, StringComparer.Ordinal);
}
