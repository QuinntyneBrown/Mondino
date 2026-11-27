using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Mondino.Application.Moments;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Moments;

/// <summary>
/// Mondino's own calendar (docs/adr/0019): the embedded <c>calendar.json</c>, read once and never
/// grown. It is the race and the event calendar, and gives <see cref="HolidayCalendar"/> the
/// holidays no public calendar Mondino may use has. It calls nothing outside, so it needs no
/// timeout, cache or breaker.
/// </summary>
internal sealed class MondinoCalendar : IRaceCalendar, IEventCalendar
{
    private const string Resource = "Mondino.Infrastructure.Moments.calendar.json";

    private readonly Lazy<List<CalendarEntry>> entries = new(Load);

    public IEnumerable<CalendarEntry> HolidaysIn(string countryCode, DateOnly first, DateOnly last) =>
        Of(MomentKind.Holiday, first, last).Where(entry => SameCountry(entry, countryCode));

    public Task<IReadOnlyList<CalendarEntry>> RaceCalendarInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<CalendarEntry>>(
            Of(MomentKind.Formula1, first, last).Where(entry => SameCountry(entry, countryCode)).ToList());

    public Task<IReadOnlyList<CalendarEntry>> EventsNearAsync(Position position, double radiusKm, DateOnly first, DateOnly last, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        return Task.FromResult<IReadOnlyList<CalendarEntry>>(
            Of(MomentKind.LocalEvent, first, last)
                .Concat(Of(MomentKind.Sport, first, last))
                .Where(entry => entry.Position is { } at && at.DistanceKmTo(position) <= radiusKm)
                .OrderBy(entry => entry.Date)
                .ToList());
    }

    private IEnumerable<CalendarEntry> Of(MomentKind kind, DateOnly first, DateOnly last) =>
        entries.Value.Where(entry => entry.Kind == kind && entry.Date >= first && entry.Date <= last);

    private static bool SameCountry(CalendarEntry entry, string countryCode) =>
        string.Equals(entry.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase);

    private static List<CalendarEntry> Load()
    {
        using var stream = typeof(MondinoCalendar).Assembly.GetManifestResourceStream(Resource)
            ?? throw new InvalidOperationException($"Mondino's calendar {Resource} is not embedded.");
        var file = JsonSerializer.Deserialize<CalendarFile>(stream)
            ?? throw new InvalidOperationException("Mondino's calendar is empty.");
        return file.Entries.Select(entry => new CalendarEntry(
                KindOf(entry.Kind),
                entry.Title,
                DateOnly.ParseExact(entry.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture),
                entry.Detail,
                entry.CountryCode,
                entry.Region,
                entry.Latitude is { } latitude && entry.Longitude is { } longitude ? new Position(latitude, longitude) : null,
                entry.Subject))
            .ToList();
    }

    private static MomentKind KindOf(string kind) => kind switch
    {
        "holiday" => MomentKind.Holiday,
        "formula-1" => MomentKind.Formula1,
        "local-event" => MomentKind.LocalEvent,
        "sport" => MomentKind.Sport,
        _ => throw new InvalidOperationException($"Mondino's calendar has an entry of no known kind: {kind}."),
    };

    private sealed record CalendarFile([property: JsonPropertyName("entries")] IReadOnlyList<FileEntry> Entries);

    private sealed record FileEntry(
        [property: JsonPropertyName("kind")] string Kind,
        [property: JsonPropertyName("date")] string Date,
        [property: JsonPropertyName("countryCode")] string CountryCode,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("detail")] string Detail,
        [property: JsonPropertyName("region")] string? Region,
        [property: JsonPropertyName("latitude")] double? Latitude,
        [property: JsonPropertyName("longitude")] double? Longitude,
        [property: JsonPropertyName("subject")] string? Subject);
}
