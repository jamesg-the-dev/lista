using RosterApp.Domain.ValueObjects;

namespace RosterApp.Domain.Tests.ValueObjects;

public class PhoneNumberTests
{
    [Theory]
    [InlineData("0412 345 678")]
    [InlineData("+61412345678")]
    [InlineData("(04)12345678")]
    [InlineData("0412345678")]
    public void Create_ValidAuMobileInVariousFormats_NormalizesToE164(string raw)
    {
        var phoneNumber = PhoneNumber.Create(raw);

        Assert.Equal("+61412345678", phoneNumber.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("123")]
    [InlineData("not a phone number")]
    [InlineData("041234567890123456")]
    public void Create_InvalidNumber_ThrowsArgumentException(string raw)
    {
        Assert.Throws<ArgumentException>(() => PhoneNumber.Create(raw));
    }

    [Theory]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("not a phone number")]
    public void TryCreate_InvalidNumber_ReturnsFalseWithError(string raw)
    {
        var result = PhoneNumber.TryCreate(raw, out var phoneNumber, out var error);

        Assert.False(result);
        Assert.Null(phoneNumber);
        Assert.NotNull(error);
    }

    [Fact]
    public void TryCreate_ValidNumber_ReturnsTrueWithNoError()
    {
        var result = PhoneNumber.TryCreate("0412 345 678", out var phoneNumber, out var error);

        Assert.True(result);
        Assert.NotNull(phoneNumber);
        Assert.Null(error);
        Assert.Equal("+61412345678", phoneNumber.Value);
    }

    [Theory]
    [InlineData("0412 345 678")]
    [InlineData("+61412345678")]
    public void TryCreateMobile_ValidMobile_ReturnsTrue(string raw)
    {
        var result = PhoneNumber.TryCreateMobile(raw, out var phoneNumber, out var error);

        Assert.True(result);
        Assert.NotNull(phoneNumber);
        Assert.Null(error);
    }

    [Fact]
    public void TryCreateMobile_LandlineNumber_ReturnsFalse()
    {
        // Sydney landline — valid AU number, not a mobile.
        var result = PhoneNumber.TryCreateMobile("(02) 9876 5432", out var phoneNumber, out var error);

        Assert.False(result);
        Assert.Null(phoneNumber);
        Assert.NotNull(error);
    }

    [Fact]
    public void Masked_ReturnsOnlyLastFourDigits()
    {
        var phoneNumber = PhoneNumber.Create("0412 345 678");

        var masked = phoneNumber.Masked();

        Assert.EndsWith("5678", masked);
        Assert.DoesNotContain("412345", masked);
    }

    [Fact]
    public void ToNational_FormatsAsAuNationalNumber()
    {
        var phoneNumber = PhoneNumber.Create("+61412345678");

        Assert.Equal("0412 345 678", phoneNumber.ToNational("AU"));
    }

    [Fact]
    public void Equals_SameNormalizedNumber_AreEqual()
    {
        var left = PhoneNumber.Create("0412 345 678");
        var right = PhoneNumber.Create("+61412345678");

        Assert.Equal(left, right);
        Assert.True(left == right);
    }

    [Fact]
    public void Equals_DifferentNumbers_AreNotEqual()
    {
        var left = PhoneNumber.Create("0412 345 678");
        var right = PhoneNumber.Create("0412 345 679");

        Assert.NotEqual(left, right);
        Assert.True(left != right);
    }
}
