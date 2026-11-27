// Acceptance Test
// Traces to: L2-007, L2-043
// Description: A postal code reaches only the teammate it belongs to; another teammate reads the city and country, and no email

using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class PostalCodePrivacyTests
{
    [Fact]
    public async Task A_teammate_reading_the_team_gets_no_other_teammates_postal_code_nor_any_part_or_hash_of_it()
    {
        // Given Sofia joined Northwind from 20121 in Italy, and Marco joined after her
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");

        // When Marco reads the team
        using var request = marco.Request(HttpMethod.Get, $"/api/teams/{marco.TeamId}/pins");
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Then Sofia's pin carries her city and country and nothing more about where she lives
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var team = JsonDocument.Parse(body);
        var pin = team.RootElement.GetProperty("pins").EnumerateArray()
            .Single(p => p.GetProperty("teammateId").GetGuid() == sofia.TeammateId);
        Assert.Equal("Sofia Bianchi", pin.GetProperty("name").GetString());
        Assert.Equal("Milan", pin.GetProperty("cityName").GetString());
        Assert.Equal("Italy", pin.GetProperty("country").GetString());
        Assert.Equal(45.46427, pin.GetProperty("position").GetProperty("latitude").GetDouble(), 5);
        Assert.Equal("Europe/Rome", pin.GetProperty("timeZoneId").GetString());
        Assert.Equal(
            ["cityName", "colour", "country", "isViewer", "name", "position", "teammateId", "timeZoneId"],
            pin.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));

        // And no postal code, nor part or hash of one, is anywhere in the answer
        Assert.DoesNotContain("20121", body, StringComparison.Ordinal);
        Assert.DoesNotContain("postal", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Hex(SHA256.HashData(Encoding.UTF8.GetBytes("20121"))), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes("20121"))), body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task No_answer_about_a_team_or_a_pin_carries_an_email()
    {
        // Given Liam made Southwind with his work email
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        var liam = await api.MakeTeamAsync(client);

        // When the team and his own profile are read
        using var pins = liam.Request(HttpMethod.Get, $"/api/teams/{liam.TeamId}/pins");
        var pinsBody = await (await client.SendAsync(pins)).Content.ReadAsStringAsync();
        using var me = liam.Request(HttpMethod.Get, $"/api/teams/{liam.TeamId}/me");
        var meBody = await (await client.SendAsync(me)).Content.ReadAsStringAsync();

        // Then neither carries his email, nor its fingerprint
        var fingerprint = (await api.TeammateAsync(liam.TeammateId)).EmailFingerprint!;
        foreach (var body in new[] { pinsBody, meBody })
        {
            Assert.Contains("Southwind", body, StringComparison.Ordinal);
            Assert.DoesNotContain("liam@", body, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("@", body, StringComparison.Ordinal);
            Assert.DoesNotContain(fingerprint, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task A_teammate_reading_their_own_profile_gets_their_own_postal_code_and_no_one_elses()
    {
        // Given Sofia joined Northwind from 20121, and Marco from M5V 2T6 in Toronto
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        await api.MoveTeammateAsync(marco.TeammateId, "M5V 2T6");

        // When Sofia reads her own profile
        using var request = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/me");
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Then it carries her own postal code, her country and her pin, and not Marco's postal code
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var profile = JsonDocument.Parse(body);
        Assert.Equal("20121", profile.RootElement.GetProperty("postalCode").GetString());
        Assert.Equal("IT", profile.RootElement.GetProperty("countryCode").GetString());
        Assert.Equal("Northwind", profile.RootElement.GetProperty("teamName").GetString());
        Assert.Equal(sofia.TeammateId, profile.RootElement.GetProperty("pin").GetProperty("teammateId").GetGuid());
        Assert.Equal("Milan", profile.RootElement.GetProperty("pin").GetProperty("cityName").GetString());
        Assert.DoesNotContain("M5V", body, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("/api/teams/{team}/teammates/{other}")]
    [InlineData("/api/teams/{team}/teammates/{other}/profile")]
    [InlineData("/api/teams/{team}/me/{other}")]
    [InlineData("/api/teams/{team}/profiles/{other}")]
    public async Task A_request_for_another_teammates_profile_is_refused_and_returns_no_postal_code(string path)
    {
        // Given Sofia joined Northwind from 20121, and Marco after her
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        await api.MoveTeammateAsync(marco.TeammateId, "20122");

        // When Sofia asks for Marco's profile by his id
        using var request = sofia.Request(
            HttpMethod.Get, path.Replace("{team}", $"{sofia.TeamId}", StringComparison.Ordinal).Replace("{other}", $"{marco.TeammateId}", StringComparison.Ordinal));
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Then it is refused with 404 and carries no postal code
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain("20122", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Marco", body, StringComparison.Ordinal);
    }

    private static string Hex(byte[] bytes) => Convert.ToHexString(bytes);
}
