using System.Diagnostics.CodeAnalysis;
using PhoneNumbers;
using LibPhoneNumber = PhoneNumbers.PhoneNumber;

namespace RosterApp.Domain.ValueObjects;

/// <summary>
/// Validates and normalizes phone numbers via libphonenumber, always
/// storing E.164 regardless of how the raw input was formatted. Create
/// throws for a domain method that has no validator upstream (defense in
/// depth); TryCreate/TryCreateMobile exist so FluentValidation can surface
/// a 400 at the API boundary instead of letting a malformed number reach a
/// domain method's ArgumentException.
/// </summary>
public sealed class PhoneNumber : IEquatable<PhoneNumber>
{
    private static readonly PhoneNumberUtil Util = PhoneNumberUtil.GetInstance();

    public string Value { get; }

    private PhoneNumber(string e164Value)
    {
        Value = e164Value;
    }

    public static PhoneNumber Create(string raw, string defaultRegion = "AU")
    {
        if (!TryCreate(raw, out var phoneNumber, out var error, defaultRegion))
        {
            throw new ArgumentException(error, nameof(raw));
        }

        return phoneNumber;
    }

    public static bool TryCreate(
        string raw,
        [NotNullWhen(true)] out PhoneNumber? phoneNumber,
        [NotNullWhen(false)] out string? error,
        string defaultRegion = "AU")
    {
        if (!TryParse(raw, defaultRegion, out var parsed, out error))
        {
            phoneNumber = null;
            return false;
        }

        phoneNumber = new PhoneNumber(Util.Format(parsed, PhoneNumberFormat.E164));
        return true;
    }

    public static bool TryCreateMobile(
        string raw,
        [NotNullWhen(true)] out PhoneNumber? phoneNumber,
        [NotNullWhen(false)] out string? error,
        string defaultRegion = "AU")
    {
        if (!TryParse(raw, defaultRegion, out var parsed, out error))
        {
            phoneNumber = null;
            return false;
        }

        var numberType = Util.GetNumberType(parsed);
        if (numberType is not (PhoneNumberType.MOBILE or PhoneNumberType.FIXED_LINE_OR_MOBILE))
        {
            phoneNumber = null;
            error = $"'{raw}' is not a mobile number.";
            return false;
        }

        phoneNumber = new PhoneNumber(Util.Format(parsed, PhoneNumberFormat.E164));
        return true;
    }

    private static bool TryParse(
        string raw,
        string defaultRegion,
        [NotNullWhen(true)] out LibPhoneNumber? parsed,
        [NotNullWhen(false)] out string? error)
    {
        parsed = null;

        if (string.IsNullOrWhiteSpace(raw))
        {
            error = "Phone number is required.";
            return false;
        }

        try
        {
            parsed = Util.Parse(raw, defaultRegion);
        }
        catch (NumberParseException ex)
        {
            error = $"'{raw}' is not a valid phone number: {ex.Message}";
            return false;
        }

        if (!Util.IsValidNumber(parsed))
        {
            parsed = null;
            error = $"'{raw}' is not a valid phone number.";
            return false;
        }

        error = null;
        return true;
    }

    /// <summary>National display formatting (e.g. "0412 345 678" for AU) — region controls formatting rules, not which number this is.</summary>
    public string ToNational(string region) => Util.Format(Util.Parse(Value, region), PhoneNumberFormat.NATIONAL);

    /// <summary>Last 4 digits only, for safe logging.</summary>
    public string Masked() => Value.Length <= 4 ? Value : $"•••{Value[^4..]}";

    public bool Equals(PhoneNumber? other) => other is not null && Value == other.Value;

    public override bool Equals(object? obj) => Equals(obj as PhoneNumber);

    public override int GetHashCode() => Value.GetHashCode();

    public override string ToString() => Value;

    public static bool operator ==(PhoneNumber? left, PhoneNumber? right) => Equals(left, right);

    public static bool operator !=(PhoneNumber? left, PhoneNumber? right) => !Equals(left, right);
}
