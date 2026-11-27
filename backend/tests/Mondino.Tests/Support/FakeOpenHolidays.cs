using System.Net;
using System.Text;
using System.Text.Json;

namespace Mondino.Tests.Support;

/// <summary>
/// The OpenHolidays API (docs/adr/0019) at the HTTP boundary, answering as the test tells it: the
/// public holidays it holds for a country, the names of its subdivisions, an error, or no answer
/// until the call is cancelled. It records every request it was sent.
/// </summary>
public sealed class FakeOpenHolidays : HttpMessageHandler
{
    private readonly List<(string Country, string Date, string Name, string[] Subdivisions)> holidays = [];
    private readonly List<(string Country, string Code, string Name)> subdivisions = [];
    private readonly List<HttpRequestMessage> requests = [];

    public SourceBehaviour Behaviour { get; set; } = SourceBehaviour.Answers;

    public IReadOnlyList<HttpRequestMessage> Requests
    {
        get
        {
            lock (requests)
            {
                return [.. requests];
            }
        }
    }

    /// <summary>A public holiday of the country, nationwide unless subdivision codes are given ("IT-LO").</summary>
    public void Holds(string country, string date, string name, params string[] subdivisionCodes) =>
        holidays.Add((country, date, name, subdivisionCodes));

    public void Names(string country, string code, string name) => subdivisions.Add((country, code, name));

    /// <summary>Completes when at least <paramref name="count"/> requests have arrived, or fails naming how many did.</summary>
    public async Task WaitForRequestsAsync(int count)
    {
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (Requests.Count < count)
        {
            if (DateTime.UtcNow > deadline)
            {
                throw new TimeoutException($"The holiday source had {Requests.Count} requests, not {count}.");
            }

            await Task.Yield();
        }
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        lock (requests)
        {
            requests.Add(request);
        }

        switch (Behaviour)
        {
            case SourceBehaviour.Hangs:
                await Task.Delay(Timeout.Infinite, cancellationToken);
                throw new OperationCanceledException(cancellationToken);
            case SourceBehaviour.Fails:
                return new HttpResponseMessage(HttpStatusCode.InternalServerError);
        }

        var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri!.Query);
        var country = query["countryIsoCode"];
        object body = request.RequestUri.AbsolutePath switch
        {
            "/PublicHolidays" => holidays
                .Where(h => h.Country == country
                    && string.CompareOrdinal(h.Date, query["validFrom"]) >= 0
                    && string.CompareOrdinal(h.Date, query["validTo"]) <= 0)
                .Select(h => new
                {
                    id = Guid.NewGuid(),
                    startDate = h.Date,
                    endDate = h.Date,
                    type = "Public",
                    name = new[] { new { language = "EN", text = h.Name } },
                    regionalScope = h.Subdivisions.Length == 0 ? "National" : "Regional",
                    temporalScope = "FullDay",
                    nationwide = h.Subdivisions.Length == 0,
                    subdivisions = h.Subdivisions.Select(code => new { code, shortName = code }).ToArray(),
                })
                .ToArray(),
            "/Subdivisions" => subdivisions
                .Where(s => s.Country == country)
                .Select(s => new
                {
                    code = s.Code,
                    isoCode = s.Code,
                    shortName = s.Code,
                    category = new[] { new { language = "EN", text = "region" } },
                    name = new[] { new { language = "EN", text = s.Name } },
                    officialLanguages = new[] { country },
                    children = Array.Empty<object>(),
                })
                .ToArray(),
            _ => Array.Empty<object>(),
        };
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
    }
}
