// Acceptance Test
// Traces to: L2-053, L2-044, L2-045
// Description: A request to make a team with a value out of bounds, from another site or too often is refused, and nothing is stored

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class CreateTeamRefusedTests
{
    private const string Teams = "/api/teams";
    private const string SixtyOne = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    [Theory]
    [InlineData("", "Sofia Bianchi", "sofia@northwind.co", "IT", "20121", null, true)]
    [InlineData("   ", "Sofia Bianchi", "sofia@northwind.co", "IT", "20121", null, true)]
    [InlineData(SixtyOne, "Sofia Bianchi", "sofia@northwind.co", "IT", "20121", null, true)]
    [InlineData("Northwind", "", "sofia@northwind.co", "IT", "20121", null, true)]
    [InlineData("Northwind", SixtyOne, "sofia@northwind.co", "IT", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "", "IT", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia", "IT", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind", "IT", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia bianchi@northwind.co", "IT", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "XX", "20121", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "IT", "2012120121201", null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "IT", null, null, true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "IT", "20121", "3173435", true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "IT", null, "no-such-city", true)]
    [InlineData("Northwind", "Sofia Bianchi", "sofia@northwind.co", "IT", "20121", null, false)]
    public async Task A_request_with_a_value_out_of_bounds_is_refused_with_validation_failed_and_nothing_is_stored(
        string teamName, string name, string email, string countryCode, string? postalCode, string? cityId, bool hasCreateRequestId)
    {
        // Given a source that knows 20121 in Italy
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When a request to make a team is sent straight to the backend with a value that breaks a rule
        using var response = await client.PostAsJsonAsync(Teams, new
        {
            teamName,
            name,
            email,
            countryCode,
            postalCode,
            cityId,
            createRequestId = hasCreateRequestId ? Guid.NewGuid() : (Guid?)null,
        });

        // Then it is refused with 400 and the code validation_failed; no team, no teammate, no session
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("validation_failed", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(0, await api.TeamCountAsync());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task An_email_over_254_characters_is_refused()
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Teams, Northwind(email: new string('a', 245) + "@northwind.co"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await api.TeamCountAsync());
    }

    [Theory]
    [InlineData("20999", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("2012", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("20121", true, HttpStatusCode.ServiceUnavailable, "postal_code_unavailable")]
    public async Task A_team_whose_city_cannot_be_found_is_refused_with_the_postal_code_s_code(
        string postalCode, bool sourceDown, HttpStatusCode status, string code)
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        api.PostalCodes.IsDown = sourceDown;
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Teams, Northwind(postalCode: postalCode));

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(0, await api.TeamCountAsync());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Theory]
    [InlineData("Sec-Fetch-Site", "cross-site")]
    [InlineData("Origin", "https://elsewhere.example")]
    public async Task A_request_from_another_site_is_refused_and_makes_no_team(string header, string value)
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, Teams) { Content = JsonContent.Create(Northwind()) };
        request.Headers.Add(header, value);

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("cross_site_request", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(0, await api.TeamCountAsync());
    }

    internal static object Northwind(
        string teamName = "Northwind", string email = "sofia@northwind.co", string postalCode = "20121") => new
        {
            teamName,
            name = "Sofia Bianchi",
            email,
            countryCode = "IT",
            postalCode,
            createRequestId = Guid.NewGuid(),
        };
}
