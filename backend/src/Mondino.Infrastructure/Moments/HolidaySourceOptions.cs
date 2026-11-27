namespace Mondino.Infrastructure.Moments;

/// <summary>The public holiday source's settings, <c>HolidaySource:*</c> (docs/adr/0019).</summary>
public sealed class HolidaySourceOptions
{
    public const string Section = "HolidaySource";

    /// <summary>The OpenHolidays API.</summary>
    public Uri BaseAddress { get; set; } = new("https://openholidaysapi.org/");
}
