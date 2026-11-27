using Mondino.Application.Moments;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Tests.Support;

/// <summary>
/// The holiday, race and event calendars, answering as the test tells them: the entries they hold,
/// each kept to the window asked for, or a failure. They record every place they were asked about,
/// as "holidays IE", "races IT" or "events 45.46,9.19", and nothing else is given to them.
/// </summary>
public sealed class FakeCalendars : IHolidayCalendar, IRaceCalendar, IEventCalendar
{
    private readonly List<CalendarEntry> holidays = [];
    private readonly List<CalendarEntry> races = [];
    private readonly List<CalendarEntry> events = [];
    private readonly List<string> asked = [];

    public bool HolidaysFail { get; set; }

    public bool RacesFail { get; set; }

    public bool EventsFail { get; set; }

    public IReadOnlyList<string> Asked
    {
        get
        {
            lock (asked)
            {
                return [.. asked];
            }
        }
    }

    public void HasHoliday(string title, DateOnly date, string countryCode, string? region = null, string detail = "Public holiday") =>
        holidays.Add(new CalendarEntry(MomentKind.Holiday, title, date, detail, countryCode, region, null, null));

    public void HasRace(string title, DateOnly date, string countryCode, string detail = "Race day") =>
        races.Add(new CalendarEntry(MomentKind.Formula1, title, date, detail, countryCode, null, null, "Formula 1"));

    public void HasEvent(MomentKind kind, string title, DateOnly date, string countryCode, double latitude, double longitude, string detail = "Nearby") =>
        events.Add(new CalendarEntry(kind, title, date, detail, countryCode, null, new Position(latitude, longitude), null));

    public Task<IReadOnlyList<CalendarEntry>> HolidaysInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken)
    {
        Record($"holidays {countryCode}");
        return HolidaysFail ? throw new HttpRequestException("The holiday calendar is down.") : Within(holidays, first, last);
    }

    public Task<IReadOnlyList<CalendarEntry>> RaceCalendarInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken)
    {
        Record($"races {countryCode}");
        return RacesFail ? throw new HttpRequestException("The race calendar is down.") : Within(races, first, last);
    }

    public Task<IReadOnlyList<CalendarEntry>> EventsNearAsync(Position position, double radiusKm, DateOnly first, DateOnly last, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        Record($"events {Math.Round(position.Latitude, 2)},{Math.Round(position.Longitude, 2)}");
        return EventsFail ? throw new HttpRequestException("The event calendar is down.") : Within(events, first, last);
    }

    // Every entry of the window, wherever it is: the finder applies the rule of who it belongs to itself.
    private static Task<IReadOnlyList<CalendarEntry>> Within(List<CalendarEntry> entries, DateOnly first, DateOnly last) =>
        Task.FromResult<IReadOnlyList<CalendarEntry>>(entries.Where(entry => entry.Date >= first && entry.Date <= last).ToList());

    private void Record(string what)
    {
        lock (asked)
        {
            asked.Add(what);
        }
    }
}
