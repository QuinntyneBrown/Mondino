using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Mondino.Application.Joining;

namespace Mondino.Infrastructure.PostalCodes;

/// <summary>
/// The postal code source: the GeoNames postal code search (docs/adr/0006). It is given the
/// country and the part of the postal code that names an area, and nothing else (L2-050). Its first
/// place goes through <see cref="PostalCodeCityResolver"/>, so the city is one Mondino holds, at
/// the city's own position (L2-006). No answer, an error or a status other than 200 is
/// <c>Unavailable</c>; no place is <c>NotFound</c>.
/// </summary>
internal sealed class GeoNamesPostalCodeLookup(
    IHttpClientFactory clients,
    IOptions<PostalCodeSourceOptions> options,
    PostalCodeCityResolver resolver)
{
    public const string ClientName = "postal-code-source";

    /// <summary>Ghana and the United Arab Emirates are not covered by the source.</summary>
    private static readonly HashSet<string> Covered = ["AU", "BR", "CA", "DE", "IN", "IE", "IT", "JP", "MX", "SE", "US"];

    /// <summary>Whether a call can be made at all: the country is covered and an account is set.</summary>
    public bool CanLookUp(string countryCode) =>
        Covered.Contains(countryCode) && !string.IsNullOrWhiteSpace(options.Value.Username);

    public async Task<PostalCodeLookupOutcome> FindCityAsync(PostalCode postalCode, CancellationToken cancellationToken)
    {
        var client = clients.CreateClient(ClientName);
        var address = new Uri(
            options.Value.BaseAddress,
            "postalCodeSearchJSON"
            + $"?postalcode={Uri.EscapeDataString(postalCode.ForSource)}"
            + $"&country={Uri.EscapeDataString(postalCode.CountryCode)}"
            + "&maxRows=1"
            + $"&username={Uri.EscapeDataString(options.Value.Username ?? string.Empty)}");

        Answer? answer;
        try
        {
            using var response = await client.GetAsync(address, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return PostalCodeLookupOutcome.Unavailable;
            }

            answer = await response.Content.ReadFromJsonAsync<Answer>(cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or System.Text.Json.JsonException
                                              or NotSupportedException)
        {
            return PostalCodeLookupOutcome.Unavailable;
        }

        if (answer is null || answer.Status is not null || answer.PostalCodes is null)
        {
            return PostalCodeLookupOutcome.Unavailable;
        }

        var place = answer.PostalCodes.Count > 0 ? answer.PostalCodes[0] : null;
        if (place?.PlaceName is null || place.Latitude is null || place.Longitude is null)
        {
            return PostalCodeLookupOutcome.NotFound;
        }

        var city = resolver.Resolve(
            postalCode.CountryCode,
            new SourcePlace(place.PlaceName, place.AdminName1, place.Latitude.Value, place.Longitude.Value));
        return city is null ? PostalCodeLookupOutcome.NotFound : PostalCodeLookupOutcome.Found(city);
    }

    private sealed record Answer(
        [property: JsonPropertyName("postalCodes")] IReadOnlyList<Place>? PostalCodes,
        [property: JsonPropertyName("status")] object? Status);

    private sealed record Place(
        [property: JsonPropertyName("placeName")] string? PlaceName,
        [property: JsonPropertyName("adminName1")] string? AdminName1,
        [property: JsonPropertyName("lat")] double? Latitude,
        [property: JsonPropertyName("lng")] double? Longitude);
}
