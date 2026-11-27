// Acceptance Test
// Traces to: L2-005, L2-006, L2-043, L2-044
// Description: Joining adds a teammate at the city of their postal code, issues their session, and refuses bad input

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class JoinTeamTests
{
    private const string Invite = "/api/invites/northwind-7Kq2";
    private const string Join = "/api/invites/northwind-7Kq2/teammates";

    [Fact]
    public async Task Joining_with_a_found_postal_code_adds_a_teammate_at_the_city_and_issues_the_session()
    {
        // Given Northwind's twelve teammates, and a source that knows 20121 in Italy is in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When Sofia joins with 20121 in Italy
        using var response = await client.PostAsJsonAsync(Join, new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
        });
        var body = await response.Content.ReadAsStringAsync();

        // Then she is a new teammate, named by random ids, and the answer carries no postal code
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var result = JsonDocument.Parse(body);
        var teamId = Guid.Parse(result.RootElement.GetProperty("teamId").GetString()!);
        var teammateId = Guid.Parse(result.RootElement.GetProperty("teammateId").GetString()!);
        Assert.Equal(4, teamId.Version);
        Assert.Equal(4, teammateId.Version);
        Assert.DoesNotContain("20121", body, StringComparison.Ordinal);

        // And Northwind has thirteen teammates, Sofia at Milan with the first teammate colour free
        var sofia = await api.TeammateAsync(teammateId);
        Assert.Equal(13, await api.TeammateCountAsync("northwind-7Kq2"));
        Assert.Equal(teamId, sofia.TeamId);
        Assert.Equal("Sofia Bianchi", sofia.Name);
        Assert.Equal("Milan", sofia.City.Name);
        Assert.Equal(KnownCities.Milan.Latitude, sofia.City.Latitude, 5);
        Assert.Equal("teammate-1", sofia.Colour);
        Assert.Equal("20121", sofia.PostalCode);

        // And her session is a cookie scripts cannot read, sent only over HTTPS and not cross-site
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("__Host-mondino-session=", cookie, StringComparison.Ordinal);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", cookie, StringComparison.OrdinalIgnoreCase);

        // And it lasts a year from now (docs/adr/0008)
        Assert.Contains("expires=Tue, 27 Oct 2026 14:05:00 GMT", cookie, StringComparison.OrdinalIgnoreCase);

        // And with it, the invite link knows she is already in the team. (The cookie is sent by
        // hand: it expires a year after the mocks' "now", which the test machine's clock is past.)
        using var again = new HttpRequestMessage(HttpMethod.Get, Invite);
        again.Headers.Add("Cookie", cookie.Split(';')[0]);
        using var answer = await client.SendAsync(again);
        var invite = await answer.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(invite.GetProperty("alreadyJoined").GetBoolean());
    }

    [Fact]
    public async Task Joining_with_a_city_chosen_while_the_lookup_is_down_places_the_pin_there_without_a_postal_code()
    {
        // Given the postal code source is down
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.IsDown = true;
        using var client = api.CreateSecureClient();

        // When Sofia joins with Milan chosen from "Your city"
        using var response = await client.PostAsJsonAsync(Join, new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            cityId = KnownCities.Milan.CityId,
            joinRequestId = Guid.NewGuid(),
        });

        // Then her pin is at Milan, the source was not asked, and no postal code is kept
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var teammateId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid();
        var sofia = await api.TeammateAsync(teammateId);
        Assert.Equal("Milan", sofia.City.Name);
        Assert.Null(sofia.PostalCode);
        Assert.Empty(api.PostalCodes.Asked);
    }

    [Fact]
    public async Task Two_teammates_placed_in_one_city_share_it()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        var first = await JoinAsync(client, "Sofia Bianchi");
        var second = await JoinAsync(client, "Marco Rossi");

        Assert.Equal((await api.TeammateAsync(first)).City.Id, (await api.TeammateAsync(second)).City.Id);
    }

    [Theory]
    [InlineData("", "IT", "20121", null, true)]
    [InlineData("   ", "IT", "20121", null, true)]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "IT", "20121", null, true)]
    [InlineData("Sofia Bianchi", "XX", "20121", null, true)]
    [InlineData("Sofia Bianchi", "IT", "2012120121201", null, true)]
    [InlineData("Sofia Bianchi", "IT", null, null, true)]
    [InlineData("Sofia Bianchi", "IT", "20121", "3173435", true)]
    [InlineData("Sofia Bianchi", "IT", null, "6167865", true)]
    [InlineData("Sofia Bianchi", "IT", null, "no-such-city", true)]
    [InlineData("Sofia Bianchi", "IT", "20121", null, false)]
    public async Task A_join_with_bad_input_is_refused_with_validation_failed_and_nothing_is_stored(
        string name, string countryCode, string? postalCode, string? cityId, bool hasJoinRequestId)
    {
        // Given Northwind, and a source that knows 20121
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When a join is sent straight to the backend with a value that breaks a rule
        using var response = await client.PostAsJsonAsync(Join, new
        {
            name,
            countryCode,
            postalCode,
            cityId,
            joinRequestId = hasJoinRequestId ? Guid.NewGuid() : (Guid?)null,
        });

        // Then it is refused with 400 and the code validation_failed, and no one is added
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("validation_failed", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(12, await api.TeammateCountAsync("northwind-7Kq2"));
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task A_name_is_stored_trimmed_and_without_control_characters()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        var teammateId = await JoinAsync(client, "  Sofia\u0007 Bianchi\n ");

        Assert.Equal("Sofia Bianchi", (await api.TeammateAsync(teammateId)).Name);
    }

    [Fact]
    public async Task Fields_the_join_does_not_define_are_ignored()
    {
        // Given a join that also sends a teammate id, a position and a colour
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var chosenId = Guid.NewGuid();

        using var response = await client.PostAsJsonAsync(Join, new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
            teammateId = chosenId,
            colour = "teammate-9",
            position = new { latitude = 0, longitude = 0 },
        });

        // Then none of them sets anything
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var teammateId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid();
        Assert.NotEqual(chosenId, teammateId);
        var sofia = await api.TeammateAsync(teammateId);
        Assert.Equal("teammate-1", sofia.Colour);
        Assert.Equal("Milan", sofia.City.Name);
    }

    [Theory]
    [InlineData("northwind-7Kq2", "20999", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("northwind-7Kq2", "2012", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("northwind-7Kq2", "20121", true, HttpStatusCode.ServiceUnavailable, "postal_code_unavailable")]
    [InlineData("reset-link", "20121", false, HttpStatusCode.NotFound, "invite_not_found")]
    public async Task A_join_whose_city_cannot_be_found_or_whose_link_does_not_work_is_refused_with_its_code(
        string inviteToken, string postalCode, bool sourceDown, HttpStatusCode status, string code)
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        api.PostalCodes.IsDown = sourceDown;
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync($"/api/invites/{inviteToken}/teammates", new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            postalCode,
            joinRequestId = Guid.NewGuid(),
        });

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(12, await api.TeammateCountAsync("northwind-7Kq2"));
    }

    [Theory]
    [InlineData("Sec-Fetch-Site", "cross-site")]
    [InlineData("Sec-Fetch-Site", "same-site")]
    [InlineData("Origin", "https://elsewhere.example")]
    public async Task A_join_sent_from_another_site_is_refused_and_signs_no_one_in(string header, string value)
    {
        // Given a page on another site that makes a visitor's browser post a join
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, Join)
        {
            Content = JsonContent.Create(new { name = "Sofia Bianchi", countryCode = "IT", postalCode = "20121", joinRequestId = Guid.NewGuid() }),
        };
        request.Headers.Add(header, value);

        // When it arrives
        using var response = await client.SendAsync(request);

        // Then it is refused with 403 and the code cross_site_request, and no session is issued
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("cross_site_request", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.False(response.Headers.Contains("Set-Cookie"));
        Assert.Equal(12, await api.TeammateCountAsync("northwind-7Kq2"));
    }

    [Fact]
    public async Task A_join_from_Mondino_itself_is_accepted()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, Join)
        {
            Content = JsonContent.Create(new { name = "Sofia Bianchi", countryCode = "IT", postalCode = "20121", joinRequestId = Guid.NewGuid() }),
        };
        request.Headers.Add("Sec-Fetch-Site", "same-origin");
        request.Headers.Add("Origin", "https://localhost");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static async Task<Guid> JoinAsync(HttpClient client, string name)
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
