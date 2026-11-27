// Traces to: L2-003, L2-004, L2-050
// Description: Each supported country's postal code form, its canonical spelling and the part the source is given

using Mondino.Application.Joining;

namespace Mondino.Tests.Joining;

public sealed class PostalCodeFormatsTests
{
    [Theory]
    [InlineData("AU", "2000", "2000", "2000")]
    [InlineData("BR", "01310100", "01310-100", "01310-100")]
    [InlineData("BR", "01310-100", "01310-100", "01310-100")]
    [InlineData("CA", "l5b3c1", "L5B 3C1", "L5B")]
    [InlineData("CA", "L5B 3C1", "L5B 3C1", "L5B")]
    [InlineData("CA", "m5v-2t6", "M5V 2T6", "M5V")]
    [InlineData("DE", "10115", "10115", "10115")]
    [InlineData("GH", "ga543", "GA543", "GA543")]
    [InlineData("IN", "560 001", "560001", "560001")]
    [InlineData("IE", "d02x285", "D02 X285", "D02")]
    [InlineData("IE", "D6W 1234", "D6W 1234", "D6W")]
    [InlineData("IT", " 20121 ", "20121", "20121")]
    [InlineData("JP", "1000001", "100-0001", "100-0001")]
    [InlineData("MX", "06000", "06000", "06000")]
    [InlineData("SE", "11122", "111 22", "111 22")]
    [InlineData("AE", "12345", "12345", "12345")]
    [InlineData("US", "78701", "78701", "78701")]
    [InlineData("US", "78701-1234", "78701-1234", "78701")]
    public void A_postal_code_that_fits_its_country_is_spelled_canonically_and_only_its_area_goes_to_the_source(
        string country, string typed, string canonical, string forSource)
    {
        Assert.True(PostalCodeFormats.TryNormalise(country, typed, out var postalCode));
        Assert.Equal(new PostalCode(country, canonical, forSource), postalCode);
    }

    [Theory]
    [InlineData("AU", "200")]
    [InlineData("BR", "0131010")]
    [InlineData("CA", "L5B 3C")]
    [InlineData("CA", "123 ABC")]
    [InlineData("CA", "W5B 3C1")]
    [InlineData("CA", "L5D 3C1")]
    [InlineData("DE", "1011")]
    [InlineData("GH", "G543")]
    [InlineData("IN", "060001")]
    [InlineData("IE", "B02 X285")]
    [InlineData("IT", "2012")]
    [InlineData("IT", "2012A")]
    [InlineData("JP", "100001")]
    [InlineData("MX", "6000")]
    [InlineData("SE", "1112")]
    [InlineData("AE", "1234567")]
    [InlineData("US", "787011")]
    [InlineData("FR", "75001")]
    public void A_postal_code_that_does_not_fit_its_country_is_refused(string country, string typed) =>
        Assert.False(PostalCodeFormats.TryNormalise(country, typed, out _));

    [Fact]
    public void The_thirteen_countries_are_listed_in_alphabetical_order_of_their_names()
    {
        var names = PostalCodeFormats.All.Select(format => format.CountryName).ToList();
        Assert.Equal(13, names.Count);
        Assert.Equal(names.Order(StringComparer.Ordinal), names);
    }
}
