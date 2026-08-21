namespace RosterApp.Application.Common;

/// <summary>
/// Shared FluentValidation predicate for IANA timezone identifiers (e.g.
/// "Australia/Melbourne"). .NET resolves IANA ids directly via ICU on every
/// supported platform, so this needs no lookup table of its own.
/// </summary>
public static class TimezoneWireValidation
{
    public static bool IsValidIanaId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(value);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }
}
