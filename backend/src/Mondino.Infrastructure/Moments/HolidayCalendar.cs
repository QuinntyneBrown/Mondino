using Mondino.Application.Moments;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Moments;

/// <summary>
/// The holiday calendar (docs/adr/0019): Mondino's own holidays and the public calendar's in the
/// window. Where both have a holiday in the country on one date and in one region (or none),
/// Mondino's own is kept, with the title and detail written for teammates.
/// </summary>
internal sealed class HolidayCalendar(MondinoCalendar own, CachedOpenHolidays openHolidays) : IHolidayCalendar
{
    public async Task<IReadOnlyList<CalendarEntry>> HolidaysInAsync(string countryCode, DateOnly first, DateOnly last, CancellationToken cancellationToken)
    {
        var ours = own.HolidaysIn(countryCode, first, last).ToList();
        var years = await Task.WhenAll(
            Enumerable.Range(first.Year, last.Year - first.Year + 1).Select(year => openHolidays.YearAsync(countryCode, year)));
        var taken = ours.Select(Key).ToHashSet();
        var theirs = years
            .SelectMany(entries => entries)
            .Where(entry => entry.Date >= first && entry.Date <= last && !taken.Contains(Key(entry)));
        return [.. ours, .. theirs];
    }

    private static (DateOnly, string) Key(CalendarEntry entry) =>
        (entry.Date, entry.Region is null ? string.Empty : PlaceNames.Fold(entry.Region));
}
