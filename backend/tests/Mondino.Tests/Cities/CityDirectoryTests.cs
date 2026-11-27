// Traces to: L2-004, L2-006
// Description: The cities Mondino holds: searched by the start of a name, largest first, and a postal code's place resolved to its city

using Mondino.Domain.Teams;
using Mondino.Infrastructure.Cities;
using Mondino.Infrastructure.PostalCodes;

namespace Mondino.Tests.Cities;

public sealed class CityDirectoryTests
{
    private static readonly BundledCityDirectory Directory = new();

    [Theory]
    [InlineData("IT", "Mil", "Milan, Lombardy|Milazzo, Sicily")]
    [InlineData("IT", "mil", "Milan, Lombardy|Milazzo, Sicily")]
    [InlineData("BR", "sao paulo", "São Paulo, São Paulo|São Paulo de Olivença, Amazonas|São Paulo do Potengi, Rio Grande do Norte")]
    [InlineData("SE", "malmo", "Malmö, Skåne")]
    [InlineData("CA", "Missis", "Mississauga, Ontario")]
    [InlineData("IT", "Xyz", "")]
    public void A_search_lists_the_countrys_cities_whose_names_start_with_the_text_largest_first(string country, string text, string expected)
    {
        var found = Directory.Search(country, text, max: 8);
        Assert.Equal(expected, string.Join('|', found.Select(city => $"{city.Name}, {city.Region}")));
    }

    [Fact]
    public void A_search_lists_at_most_the_number_asked_for() =>
        Assert.Equal(8, Directory.Search("US", "S", max: 8).Count);

    [Fact]
    public void A_city_is_found_by_its_id_with_its_own_position_and_time_zone()
    {
        var milan = Directory.Find("3173435");
        Assert.NotNull(milan);
        Assert.Equal(("Milan", "Lombardy", "IT", "Europe/Rome"), (milan.Name, milan.Region, milan.CountryCode, milan.TimeZoneId));
        Assert.Equal(45.46427, milan.Latitude, 4);
    }

    [Theory]
    [InlineData("CA", "Toronto (Queen's Park)", 43.6629, -79.3957, "Toronto")]
    [InlineData("CA", "Toronto (Harbourfront)", 43.6395, -79.3988, "Toronto")]
    [InlineData("CA", "Mississauga City Centre", 43.5933, -79.6441, "Mississauga")]
    [InlineData("IT", "Milano", 45.4668, 9.1905, "Milan")]
    [InlineData("US", "Springfield", 39.7817, -89.6501, "Springfield")]
    [InlineData("IT", "Cascina Nuova", 45.4700, 9.2000, "Milan")]
    public void A_place_resolves_to_the_city_of_its_name_or_else_the_nearest_city_at_the_citys_own_position(
        string country, string place, double latitude, double longitude, string expected)
    {
        var resolver = new PostalCodeCityResolver(Directory);

        var city = resolver.Resolve(country, new SourcePlace(place, null, latitude, longitude));

        Assert.NotNull(city);
        Assert.Equal(expected, city.Name);
        Assert.Same(Directory.Find(city.CityId), city);
        Assert.NotEqual((latitude, longitude), (city.Latitude, city.Longitude));
    }

    [Fact]
    public void Two_places_in_Toronto_resolve_to_one_position()
    {
        var resolver = new PostalCodeCityResolver(Directory);

        var first = resolver.Resolve("CA", new SourcePlace("Toronto (Queen's Park)", "Ontario", 43.6629, -79.3957));
        var second = resolver.Resolve("CA", new SourcePlace("Toronto (Harbourfront)", "Ontario", 43.6395, -79.3988));

        Assert.Equal((first!.Latitude, first.Longitude), (second!.Latitude, second.Longitude));
    }

    [Fact]
    public void A_springfield_is_the_one_nearest_the_place()
    {
        var resolver = new PostalCodeCityResolver(Directory);
        var city = resolver.Resolve("US", new SourcePlace("Springfield", null, 39.7817, -89.6501));
        Assert.Equal("Illinois", city!.Region);
    }

    [Theory]
    [InlineData("São Paulo", "sao paulo")]
    [InlineData("  Saint-Laurent ", "saint laurent")]
    [InlineData("MILAN", "milan")]
    public void Names_are_compared_without_accents_case_or_punctuation(string name, string folded) =>
        Assert.Equal(folded, PlaceNames.Fold(name));
}
