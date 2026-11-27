// Traces to: L2-020
// Description: A calendar entry belongs to a city by the rule of its kind, one case per row of L2-020's table, and a moment's title and detail are cut to 80 and 160 characters

using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Tests.Moments;

public sealed class MomentRulesTests
{
    private static readonly City Dublin = CityAt("Dublin", "IE", "Leinster", 53.3498, -6.2603);
    private static readonly City Milan = CityAt("Milan", "IT", "Lombardy", 45.4642, 9.19);
    private static readonly City Rome = CityAt("Rome", "IT", "Lazio", 41.8919, 12.5113);
    private static readonly City Austin = CityAt("Austin", "US", "Texas", 30.2672, -97.7431);
    private static readonly City Toronto = CityAt("Toronto", "CA", "Ontario", 43.6533, -79.3839);
    private static readonly City Mississauga = CityAt("Mississauga", "CA", "Ontario", 43.5789, -79.6583);
    private static readonly City Ottawa = CityAt("Ottawa", "CA", "Ontario", 45.4112, -75.6981);

    private static readonly DateOnly Day = new(2025, 10, 27);

    [Fact]
    public void A_national_holiday_belongs_to_every_city_of_its_country()
    {
        var bankHoliday = Holiday("IE", region: null);

        Assert.True(bankHoliday.BelongsTo(Dublin));
        Assert.False(bankHoliday.BelongsTo(Milan));
    }

    [Fact]
    public void A_regional_holiday_belongs_to_the_cities_of_its_region_only()
    {
        // Named as a source names it, with its case and accents ignored
        var lombardy = Holiday("IT", region: "LOMBARDY");

        Assert.True(lombardy.BelongsTo(Milan));
        Assert.False(lombardy.BelongsTo(Rome));
    }

    [Fact]
    public void A_region_named_as_a_state_is_the_same_region()
    {
        var berlin = CityAt("Berlin", "DE", "State of Berlin", 52.52, 13.405);

        Assert.True(Holiday("DE", region: "Berlin").BelongsTo(berlin));
        Assert.False(Holiday("DE", region: "Bavaria").BelongsTo(berlin));
    }

    [Fact]
    public void A_regional_holiday_does_not_belong_to_a_city_whose_region_is_not_known()
    {
        var lombardy = Holiday("IT", region: "Lombardy");
        var milanWithoutRegion = new City(Guid.NewGuid(), "Milan", "IT", new Position(45.4642, 9.19), "Europe/Rome");

        Assert.False(lombardy.BelongsTo(milanWithoutRegion));
    }

    [Fact]
    public void A_formula_1_entry_belongs_to_the_country_that_holds_the_race()
    {
        var monza = new CalendarEntry(MomentKind.Formula1, "Italian Grand Prix", Day, "Race day at Monza", "IT", null, new Position(45.6156, 9.2811), "Formula 1");

        Assert.True(monza.BelongsTo(Milan));
        Assert.True(monza.BelongsTo(Rome));
        Assert.False(monza.BelongsTo(Austin));
    }

    [Theory]
    [InlineData(MomentKind.Sport)]
    [InlineData(MomentKind.LocalEvent)]
    public void An_event_or_a_fixture_belongs_to_the_cities_within_100_km(MomentKind kind)
    {
        // The Raptors play at home in Toronto: Mississauga is 23 km away, Ottawa 350 km
        var raptors = new CalendarEntry(kind, "Raptors home game", Day, "At Scotiabank Arena", "CA", null, new Position(43.6435, -79.3791), "Toronto Raptors");

        Assert.True(raptors.BelongsTo(Toronto));
        Assert.True(raptors.BelongsTo(Mississauga));
        Assert.False(raptors.BelongsTo(Ottawa));
    }

    [Fact]
    public void An_event_with_no_position_belongs_to_no_city()
    {
        var nowhere = new CalendarEntry(MomentKind.LocalEvent, "Somewhere", Day, "Detail", "CA", null, null, null);

        Assert.False(nowhere.BelongsTo(Toronto));
    }

    [Fact]
    public void The_distance_between_two_positions_is_the_great_circle_in_kilometres()
    {
        var distance = Toronto.Position.DistanceKmTo(Ottawa.Position);

        Assert.InRange(distance, 349, 354);
        Assert.Equal(0, Milan.Position.DistanceKmTo(Milan.Position), precision: 6);
    }

    [Fact]
    public void A_title_over_80_and_a_detail_over_160_characters_are_cut_with_an_ellipsis()
    {
        var moment = Moment.Create(MomentKind.LocalEvent, new string('T', 81), Day, new string('D', 161), null);

        Assert.Equal(80, moment.Title.Length);
        Assert.EndsWith("…", moment.Title, StringComparison.Ordinal);
        Assert.StartsWith(new string('T', 79), moment.Title, StringComparison.Ordinal);
        Assert.Equal(160, moment.Detail.Length);
        Assert.EndsWith("…", moment.Detail, StringComparison.Ordinal);
    }

    [Fact]
    public void A_title_of_80_and_a_detail_of_160_characters_are_kept_whole_and_trimmed()
    {
        var title = new string('T', 80);
        var detail = new string('D', 160);

        var moment = Moment.Create(MomentKind.Holiday, $"  {title} ", Day, detail, null);

        Assert.Equal(title, moment.Title);
        Assert.Equal(detail, moment.Detail);
    }

    private static CalendarEntry Holiday(string countryCode, string? region) =>
        new(MomentKind.Holiday, "A holiday", Day, "Public holiday", countryCode, region, null, null);

    private static City CityAt(string name, string countryCode, string region, double latitude, double longitude) =>
        new(Guid.NewGuid(), name, countryCode, new Position(latitude, longitude), "Etc/UTC", region: region);
}
