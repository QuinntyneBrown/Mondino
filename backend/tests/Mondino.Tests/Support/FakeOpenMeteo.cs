using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Mondino.Tests.Support;

/// <summary>
/// The outside weather service (Open-Meteo, docs/adr/0015) at the HTTP boundary, answering as the
/// test tells it: a reading for a latitude and longitude as they are sent ("45.46"), one reading
/// for everywhere else, an error, or no answer until the call is cancelled. It records every
/// request it was sent.
/// </summary>
public sealed class FakeOpenMeteo : HttpMessageHandler
{
    private readonly Dictionary<string, (double Temperature, int Code, double Wind)> readings = [];
    private readonly List<HttpRequestMessage> requests = [];
    private (double Temperature, int Code, double Wind) everywhere = (20, 3, 5);

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

    /// <summary>The source reports <paramref name="temperature"/> °C, WMO code <paramref name="code"/> and <paramref name="wind"/> km/h there.</summary>
    public void Reports(string latitude, string longitude, double temperature, int code, double wind = 5) =>
        readings[$"{latitude} {longitude}"] = (temperature, code, wind);

    public void ReportsEverywhere(double temperature, int code, double wind = 5) => everywhere = (temperature, code, wind);

    /// <summary>Completes when at least <paramref name="count"/> requests have arrived, or fails naming how many did.</summary>
    public async Task WaitForRequestsAsync(int count)
    {
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (Requests.Count < count)
        {
            if (DateTime.UtcNow > deadline)
            {
                throw new TimeoutException($"The weather source had {Requests.Count} requests, not {count}.");
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
                // Waits for the caller to give up; never a sleep.
                await Task.Delay(Timeout.Infinite, cancellationToken);
                throw new OperationCanceledException(cancellationToken);
            case SourceBehaviour.Fails:
                return new HttpResponseMessage(HttpStatusCode.InternalServerError);
        }

        var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri!.Query);
        var reading = readings.TryGetValue($"{query["latitude"]} {query["longitude"]}", out var found) ? found : everywhere;
        var body = new
        {
            latitude = double.Parse(query["latitude"]!, CultureInfo.InvariantCulture),
            longitude = double.Parse(query["longitude"]!, CultureInfo.InvariantCulture),
            current = new
            {
                time = "2025-10-27T14:00",
                interval = 900,
                temperature_2m = reading.Temperature,
                weather_code = reading.Code,
                wind_speed_10m = reading.Wind,
            },
        };
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
    }
}
