using System.Diagnostics.CodeAnalysis;

namespace RosterApp.Domain.ValueObjects;

/// <summary>
/// Australian Business Number — stored normalized as 11 digits, no spaces.
/// Create throws for a domain method that has no validator upstream
/// (defense in depth, same rationale as PhoneNumber); TryCreate exists so
/// FluentValidation can surface a 400 at the API boundary instead of
/// letting a malformed ABN reach a domain method's ArgumentException.
/// </summary>
public sealed class Abn : IEquatable<Abn>
{
    // ABN checksum per the ATO algorithm: subtract 1 from the first digit,
    // multiply every digit by its weighting factor, and the sum must be
    // evenly divisible by 89.
    private static readonly int[] WeightingFactors = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

    public string Value { get; }

    private Abn(string normalizedValue)
    {
        Value = normalizedValue;
    }

    public static Abn Create(string raw)
    {
        if (!TryCreate(raw, out var abn, out var error))
        {
            throw new ArgumentException(error, nameof(raw));
        }

        return abn;
    }

    public static bool TryCreate(
        string raw,
        [NotNullWhen(true)] out Abn? abn,
        [NotNullWhen(false)] out string? error)
    {
        abn = null;

        if (string.IsNullOrWhiteSpace(raw))
        {
            error = "ABN is required.";
            return false;
        }

        var digits = new string(raw.Where(char.IsAsciiDigit).ToArray());
        if (digits.Length != 11)
        {
            error = $"'{raw}' is not a valid ABN: must be 11 digits.";
            return false;
        }

        if (!HasValidChecksum(digits))
        {
            error = $"'{raw}' is not a valid ABN: checksum failed.";
            return false;
        }

        abn = new Abn(digits);
        error = null;
        return true;
    }

    private static bool HasValidChecksum(string digits)
    {
        var sum = 0;
        for (var i = 0; i < digits.Length; i++)
        {
            var digit = digits[i] - '0';
            if (i == 0)
            {
                digit -= 1;
            }

            sum += digit * WeightingFactors[i];
        }

        return sum % 89 == 0;
    }

    /// <summary>Grouped as "12 345 678 901" for display.</summary>
    public string ToFormatted() => $"{Value[..2]} {Value[2..5]} {Value[5..8]} {Value[8..11]}";

    public bool Equals(Abn? other) => other is not null && Value == other.Value;

    public override bool Equals(object? obj) => Equals(obj as Abn);

    public override int GetHashCode() => Value.GetHashCode();

    public override string ToString() => Value;

    public static bool operator ==(Abn? left, Abn? right) => Equals(left, right);

    public static bool operator !=(Abn? left, Abn? right) => !Equals(left, right);
}
