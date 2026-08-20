using RosterApp.Domain.Rostering;
using RosterApp.Infrastructure.ComplianceValidator;

namespace RosterApp.Infrastructure.Tests.ComplianceValidator;

public class HospitalityGeneralAwardComplianceValidatorTests
{
    private static readonly Guid EmployeeId = Guid.NewGuid();

    private readonly HospitalityGeneralAwardComplianceValidator _validator = new();

    private static Shift BuildShift(
        DateOnly date,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes = 0,
        Guid? employeeId = null) =>
        Shift.Create(Guid.NewGuid(), employeeId ?? EmployeeId, date, start, end, unpaidBreakMinutes, 30m, []);

    [Fact]
    public async Task ValidateAsync_OrdinaryShiftNoContext_ReturnsNoViolations()
    {
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(9, 0), new TimeOnly(15, 0), unpaidBreakMinutes: 30);

        var violations = await _validator.ValidateAsync(shift, [], CancellationToken.None);

        Assert.Empty(violations);
    }

    [Fact]
    public async Task ValidateAsync_ShiftSpanOver12Hours_RaisesSpanOfHoursExceeded()
    {
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(6, 0), new TimeOnly(19, 0), unpaidBreakMinutes: 30);

        var violations = await _validator.ValidateAsync(shift, [], CancellationToken.None);

        Assert.Contains(
            violations,
            v => v.Type == ComplianceViolationType.SpanOfHoursExceeded && v.Severity == ComplianceSeverity.Warning);
    }

    [Fact]
    public async Task ValidateAsync_Over5HoursWithNoBreakRecorded_RaisesMissingBreak()
    {
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(9, 0), new TimeOnly(15, 0), unpaidBreakMinutes: 0);

        var violations = await _validator.ValidateAsync(shift, [], CancellationToken.None);

        Assert.Contains(violations, v => v.Type == ComplianceViolationType.MissingBreak);
    }

    [Fact]
    public async Task ValidateAsync_Over5HoursWithBreakRecorded_DoesNotRaiseMissingBreak()
    {
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(9, 0), new TimeOnly(15, 0), unpaidBreakMinutes: 30);

        var violations = await _validator.ValidateAsync(shift, [], CancellationToken.None);

        Assert.DoesNotContain(violations, v => v.Type == ComplianceViolationType.MissingBreak);
    }

    [Fact]
    public async Task ValidateAsync_LessThan10HoursRestFromPriorDayShift_RaisesInsufficientRest()
    {
        var previous = BuildShift(new DateOnly(2026, 8, 23), new TimeOnly(18, 0), new TimeOnly(23, 0));
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(6, 0), new TimeOnly(14, 0));

        var violations = await _validator.ValidateAsync(shift, [previous], CancellationToken.None);

        Assert.Contains(violations, v => v.Type == ComplianceViolationType.InsufficientRest);
    }

    [Fact]
    public async Task ValidateAsync_AtLeast10HoursRestFromPriorDayShift_DoesNotRaiseInsufficientRest()
    {
        var previous = BuildShift(new DateOnly(2026, 8, 23), new TimeOnly(9, 0), new TimeOnly(17, 0));
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(9, 0), new TimeOnly(17, 0));

        var violations = await _validator.ValidateAsync(shift, [previous], CancellationToken.None);

        Assert.DoesNotContain(violations, v => v.Type == ComplianceViolationType.InsufficientRest);
    }

    [Fact]
    public async Task ValidateAsync_ContextShiftForDifferentEmployee_IsIgnoredForRestCheck()
    {
        var otherEmployeeShift = BuildShift(
            new DateOnly(2026, 8, 23), new TimeOnly(18, 0), new TimeOnly(23, 0), employeeId: Guid.NewGuid());
        var shift = BuildShift(new DateOnly(2026, 8, 24), new TimeOnly(6, 0), new TimeOnly(14, 0));

        var violations = await _validator.ValidateAsync(shift, [otherEmployeeShift], CancellationToken.None);

        Assert.DoesNotContain(violations, v => v.Type == ComplianceViolationType.InsufficientRest);
    }

    [Fact]
    public async Task ValidateAsync_SevenConsecutiveDaysIncludingProposedShift_RaisesMaxConsecutiveDays()
    {
        var anchor = new DateOnly(2026, 8, 24);
        var context = Enumerable.Range(1, 6)
            .Select(offset => BuildShift(anchor.AddDays(-offset), new TimeOnly(9, 0), new TimeOnly(13, 0)))
            .ToList();
        var shift = BuildShift(anchor, new TimeOnly(9, 0), new TimeOnly(13, 0));

        var violations = await _validator.ValidateAsync(shift, context, CancellationToken.None);

        Assert.Contains(violations, v => v.Type == ComplianceViolationType.MaxConsecutiveDays);
    }

    [Fact]
    public async Task ValidateAsync_SixConsecutiveDaysIncludingProposedShift_DoesNotRaiseMaxConsecutiveDays()
    {
        var anchor = new DateOnly(2026, 8, 24);
        var context = Enumerable.Range(1, 5)
            .Select(offset => BuildShift(anchor.AddDays(-offset), new TimeOnly(9, 0), new TimeOnly(13, 0)))
            .ToList();
        var shift = BuildShift(anchor, new TimeOnly(9, 0), new TimeOnly(13, 0));

        var violations = await _validator.ValidateAsync(shift, context, CancellationToken.None);

        Assert.DoesNotContain(violations, v => v.Type == ComplianceViolationType.MaxConsecutiveDays);
    }
}
