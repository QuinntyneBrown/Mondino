using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Application.Moments;

/// <summary>
/// The rule of which moments belong to a city (L2-020): each calendar is asked about the city's
/// place for the window from today, in the city's own time zone, to 90 days ahead, and only the
/// entries that <see cref="CalendarEntry.BelongsTo"/> the city are kept, whatever a source filtered
/// itself. A calendar that fails gives nothing, and the others' moments are still found (L2-049).
/// </summary>
public sealed class MomentFinder(
    IHolidayCalendar holidays,
    IRaceCalendar races,
    IEventCalendar events,
    EmblemCatalogue emblems,
    TimeProvider time)
{
    public const int DaysAhead = 90;

    public async Task<IReadOnlyList<Moment>> FindForAsync(City city, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(city);
        var today = TodayIn(city.TimeZoneId);
        var last = today.AddDays(DaysAhead);

        var found = await Task.WhenAll(
            Quietly(() => holidays.HolidaysInAsync(city.CountryCode, today, last, cancellationToken), cancellationToken),
            Quietly(() => races.RaceCalendarInAsync(city.CountryCode, today, last, cancellationToken), cancellationToken),
            Quietly(() => events.EventsNearAsync(city.Position, CalendarEntry.RadiusKm, today, last, cancellationToken), cancellationToken));

        return found
            .SelectMany(entries => entries)
            .Where(entry => entry.Date >= today && entry.Date <= last && entry.BelongsTo(city))
            .Select(entry => Moment.Create(entry.Kind, entry.Title, entry.Date, entry.Detail, emblems.KeyFor(entry.Subject)))
            .OrderBy(moment => moment.Date)
            .ToList();
    }

    /// <summary>Today's date in a time zone, by <see cref="TimeProvider"/>.</summary>
    private DateOnly TodayIn(string timeZoneId)
    {
        var now = time.GetUtcNow();
        var local = TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var zone)
            ? TimeZoneInfo.ConvertTime(now, zone)
            : now;
        return DateOnly.FromDateTime(local.DateTime);
    }

    private static async Task<IReadOnlyList<CalendarEntry>> Quietly(
        Func<Task<IReadOnlyList<CalendarEntry>>> read, CancellationToken cancellationToken)
    {
        try
        {
            return await read();
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // A failing calendar never fails the read (docs/adr/0019).
            return [];
        }
    }
}
