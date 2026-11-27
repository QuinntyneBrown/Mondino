using Mondino.Application.Moments;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Moments;

/// <summary>Calendars with nothing in them, until their sources are built.</summary>
internal sealed class NoCalendars : IHolidayCalendar, IRaceCalendar, IEventCalendar
{
    private static readonly Task<IReadOnlyList<CalendarEntry>> None = Task.FromResult<IReadOnlyList<CalendarEntry>>([]);

    public Task<IReadOnlyList<CalendarEntry>> HolidaysInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken) => None;

    public Task<IReadOnlyList<CalendarEntry>> RaceCalendarInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken) => None;

    public Task<IReadOnlyList<CalendarEntry>> EventsNearAsync(Position position, double radiusKm, DateOnly first, DateOnly last, CancellationToken cancellationToken) => None;
}
