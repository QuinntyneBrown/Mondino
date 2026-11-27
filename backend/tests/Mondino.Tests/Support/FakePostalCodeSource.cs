using System.Net;
using System.Text;
using System.Text.Json;

namespace Mondino.Tests.Support;

/// <summary>
/// The outside postal code service (GeoNames, docs/adr/0006) at the HTTP boundary, answering as the
/// test tells it: a place for a postal code, nothing, an error, or no answer until the call is
/// cancelled. It records every request it was sent.
/// </summary>
public sealed class FakePostalCodeSource : HttpMessageHandler
{
    private readonly Dictionary<string, (string Place, string Region, double Latitude, double Longitude)> places = [];
    private readonly List<HttpRequestMessage> requests = [];
    private TaskCompletionSource called = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>How the source answers a postal code it does not know a place for.</summary>
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

    /// <summary>The source knows <paramref name="postalCode"/> (as it is sent: "L5B") in a country to be a place.</summary>
    public void Knows(string country, string postalCode, string place, string region, double latitude, double longitude) =>
        places[$"{country} {postalCode}"] = (place, region, latitude, longitude);

    /// <summary>Completes when the next request arrives, or fails naming what did arrive.</summary>
    public async Task WaitForCallAsync()
    {
        try
        {
            await called.Task.WaitAsync(TimeSpan.FromSeconds(10));
        }
        catch (TimeoutException)
        {
            throw new TimeoutException($"The postal code source was not called; it had {Requests.Count} requests.");
        }
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        lock (requests)
        {
            requests.Add(request);
        }

        var wasCalled = called;
        called = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        wasCalled.TrySetResult();

        switch (Behaviour)
        {
            case SourceBehaviour.Hangs:
                // Waits for the caller to give up; never a sleep.
                await Task.Delay(Timeout.Infinite, cancellationToken);
                throw new OperationCanceledException(cancellationToken);
            case SourceBehaviour.Fails:
                return new HttpResponseMessage(HttpStatusCode.InternalServerError);
            case SourceBehaviour.RefusesTheAccount:
                return Json(new { status = new { message = "user account not enabled", value = 10 } });
        }

        var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri!.Query);
        var key = $"{query["country"]} {query["postalcode"]}";
        object[] found = places.TryGetValue(key, out var p)
            ? [new { postalCode = query["postalcode"], countryCode = query["country"], placeName = p.Place, adminName1 = p.Region, lat = p.Latitude, lng = p.Longitude }]
            : [];
        return Json(new { postalCodes = found });
    }

    private static HttpResponseMessage Json(object body) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
}

public enum SourceBehaviour
{
    Answers,
    Hangs,
    Fails,
    RefusesTheAccount,

    /// <summary>No answer until the test releases it, then the answer it would give.</summary>
    Stalls,
}
