using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Application.Moments;

/// <summary>
/// The holiday calendar (docs/adr/0019): Mondino's own holidays and the OpenHolidays API's, behind
/// a 5-second timeout, a cache and a breaker. It is given a country and the window, and nothing
/// about a teammate (L2-050).
/// </summary>
public interface IHolidayCalendar
{
    Task<IReadOnlyList<CalendarEntry>> HolidaysInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken);
}

/// <summary>
/// The race calendar (docs/adr/0019): the Formula 1 race weekends held in a country, and the dated
/// happenings of those races' own calendars, such as their tickets going on sale.
/// </summary>
public interface IRaceCalendar
{
    Task<IReadOnlyList<CalendarEntry>> RaceCalendarInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken);
}

/// <summary>The event calendar (docs/adr/0019): local events and sport fixtures near a position.</summary>
public interface IEventCalendar
{
    Task<IReadOnlyList<CalendarEntry>> EventsNearAsync(Position position, double radiusKm, DateOnly first, DateOnly last, CancellationToken cancellationToken);
}
