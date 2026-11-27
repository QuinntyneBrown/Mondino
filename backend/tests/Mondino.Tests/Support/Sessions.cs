using System.Net.Http.Json;
using System.Text.Json;

namespace Mondino.Tests.Support;

/// <summary>A teammate signed in for real: their ids and the cookies their browser holds.</summary>
public sealed record Session(Guid TeamId, Guid TeammateId, string Cookies)
{
    /// <summary>The antiforgery token the API gave the session, read from its script-readable cookie.</summary>
    public string? AntiforgeryToken { get; init; }

    /// <summary>
    /// A request sent with the session's cookies. They are sent by hand: they expire a year after
    /// the mocks' "now", which the test machine's clock is past, so a cookie container drops them.
    /// </summary>
    public HttpRequestMessage Request(HttpMethod method, string path, object? body = null, bool withToken = true)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Cookie", Cookies);
        if (withToken && AntiforgeryToken is not null)
        {
            request.Headers.Add("X-XSRF-TOKEN", AntiforgeryToken);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }
}

/// <summary>Signs teammates in the way a browser does: by joining a team or by making one.</summary>
public static class Sessions
{
    public const string SessionCookie = "__Host-mondino-session";
    public const string AntiforgeryCookie = "__Host-mondino-xsrf";

    /// <summary>Joins Northwind (seeded) through its invite link from 20121 in Italy, as <paramref name="name"/>.</summary>
    public static async Task<Session> JoinNorthwindAsync(this MondinoApi api, HttpClient client, string name = "Sofia Bianchi")
    {
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var response = await client.PostAsJsonAsync("/api/invites/northwind-7Kq2/teammates", new
        {
            name,
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
        });
        response.EnsureSuccessStatusCode();
        return await SessionOfAsync(response);
    }

    /// <summary>Makes a team named <paramref name="teamName"/> from M5V 2T6 in Canada, so its maker is in Toronto.</summary>
    public static async Task<Session> MakeTeamAsync(
        this MondinoApi api, HttpClient client, string teamName = "Southwind", string email = "liam@southwind.co")
    {
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        using var response = await client.PostAsJsonAsync("/api/teams", new
        {
            teamName,
            name = "Liam O’Connor",
            email,
            countryCode = "CA",
            postalCode = "M5V 2T6",
            createRequestId = Guid.NewGuid(),
        });
        response.EnsureSuccessStatusCode();
        return await SessionOfAsync(response);
    }

    private static async Task<Session> SessionOfAsync(HttpResponseMessage response)
    {
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var cookies = response.Headers.GetValues("Set-Cookie").Select(cookie => cookie.Split(';')[0]).ToList();
        var token = cookies.FirstOrDefault(cookie => cookie.StartsWith(AntiforgeryCookie + "=", StringComparison.Ordinal))?
            .Substring(AntiforgeryCookie.Length + 1);
        return new Session(
            body.RootElement.GetProperty("teamId").GetGuid(),
            body.RootElement.GetProperty("teammateId").GetGuid(),
            string.Join("; ", cookies))
        {
            AntiforgeryToken = token is null ? null : Uri.UnescapeDataString(token),
        };
    }
}
