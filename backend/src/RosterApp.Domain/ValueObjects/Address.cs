namespace RosterApp.Domain.ValueObjects;

public enum AustralianState
{
    NSW,
    VIC,
    QLD,
    WA,
    SA,
    TAS,
    ACT,
    NT,
}

/// <summary>
/// Structured Australian postal address — deliberately not free text, so
/// payroll exports and compliance calculations (which key off State) have a
/// reliable field to read. Owned by Venue as a single value (EF OwnsOne, see
/// VenueConfiguration) rather than a scalar-converted VO like Abn/PhoneNumber
/// since it has several sub-fields. Field-level validation (postcode format,
/// required lines) lives in the owning command's FluentValidation validator,
/// not here — this is a plain data holder, same as AwardBreakdownLine/
/// ComplianceViolation in the Rostering context.
/// </summary>
public sealed record Address(
    string Line1,
    string? Line2,
    string Suburb,
    AustralianState State,
    string Postcode,
    string Country = "AU");
