// Acceptance Test
// Traces to: L2-011
// Description: A teammate who joins is given a colour of the pin palette that differs from the teammates nearest to them, where the palette allows

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Application.Joining;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class PinColourTests
{
    private const string Join = "/api/invites/northwind-7Kq2/teammates";

    [Fact]
    public async Task Once_every_colour_is_taken_a_new_teammate_gets_the_colour_whose_nearest_holder_is_farthest_away()
    {
        // Given Northwind's twelve teammates, each in a colour of their own, and Sofia, who joins
        // from Milan in the one colour left (teammate-1)
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var sofia = await JoinFromMilanAsync(client, "Sofia Bianchi");
        Assert.Equal("teammate-1", (await api.TeammateAsync(sofia)).Colour);

        // When Marco joins from Milan too, with all thirteen colours taken once
        var marco = await JoinFromMilanAsync(client, "Marco Rossi");

        // Then his colour is neither Sofia's nor Luca's, his neighbours in Milan, but the colour
        // of the teammate farthest from Milan: Noah's, in Melbourne
        var colour = (await api.TeammateAsync(marco)).Colour;
        Assert.NotEqual("teammate-1", colour);
        Assert.NotEqual("teammate-13", colour);
        Assert.Equal("teammate-9", colour);
    }

    [Fact]
    public async Task While_a_colour_is_free_a_new_teammate_gets_the_first_one_free()
    {
        // Given Northwind's twelve teammates in teammate-2 to teammate-13
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When Sofia joins from Milan
        var sofia = await JoinFromMilanAsync(client, "Sofia Bianchi");

        // Then she is given the colour no one has
        Assert.Equal("teammate-1", (await api.TeammateAsync(sofia)).Colour);
        Assert.Equal(13, PinColourPicker.Colours);
    }

    private static async Task<Guid> JoinFromMilanAsync(HttpClient client, string name)
    {
        using var response = await client.PostAsJsonAsync(Join, new
        {
            name,
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid();
    }
}
