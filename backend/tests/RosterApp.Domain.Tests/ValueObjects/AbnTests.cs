using RosterApp.Domain.ValueObjects;

namespace RosterApp.Domain.Tests.ValueObjects;

public class AbnTests
{
    // Real, publicly-known valid ABNs (ATO's own registered entities), in a
    // few common raw input formats.
    [Theory]
    [InlineData("51 824 753 556")]
    [InlineData("51824753556")]
    [InlineData("51-824-753-556")]
    public void Create_ValidAbnInVariousFormats_NormalizesToElevenDigits(string raw)
    {
        var abn = Abn.Create(raw);

        Assert.Equal("51824753556", abn.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("123")]
    [InlineData("not an abn")]
    [InlineData("51824753557")] // fails checksum
    public void Create_InvalidAbn_ThrowsArgumentException(string raw)
    {
        Assert.Throws<ArgumentException>(() => Abn.Create(raw));
    }

    [Theory]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("51824753557")]
    public void TryCreate_InvalidAbn_ReturnsFalseWithError(string raw)
    {
        var result = Abn.TryCreate(raw, out var abn, out var error);

        Assert.False(result);
        Assert.Null(abn);
        Assert.NotNull(error);
    }

    [Fact]
    public void TryCreate_ValidAbn_ReturnsTrueWithNoError()
    {
        var result = Abn.TryCreate("51 824 753 556", out var abn, out var error);

        Assert.True(result);
        Assert.NotNull(abn);
        Assert.Null(error);
        Assert.Equal("51824753556", abn.Value);
    }

    [Fact]
    public void ToFormatted_GroupsDigits()
    {
        var abn = Abn.Create("51824753556");

        Assert.Equal("51 824 753 556", abn.ToFormatted());
    }

    [Fact]
    public void Equals_SameNormalizedValue_AreEqual()
    {
        var left = Abn.Create("51 824 753 556");
        var right = Abn.Create("51824753556");

        Assert.Equal(left, right);
        Assert.True(left == right);
    }

    [Fact]
    public void Equals_DifferentAbns_AreNotEqual()
    {
        var left = Abn.Create("51 824 753 556");
        var right = Abn.Create("53 004 085 616");

        Assert.NotEqual(left, right);
        Assert.True(left != right);
    }
}
