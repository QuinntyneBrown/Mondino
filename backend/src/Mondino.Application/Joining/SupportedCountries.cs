namespace Mondino.Application.Joining;

/// <summary>
/// The countries a teammate can join from, in alphabetical order of their names. The postal code
/// lookup (journey 3) adds each country's form of postal code.
/// </summary>
public static class SupportedCountries
{
    public static IReadOnlyList<CountryDto> All { get; } =
    [
        new("AU", "Australia"),
        new("BR", "Brazil"),
        new("CA", "Canada"),
        new("DE", "Germany"),
        new("GH", "Ghana"),
        new("IN", "India"),
        new("IE", "Ireland"),
        new("IT", "Italy"),
        new("JP", "Japan"),
        new("MX", "Mexico"),
        new("SE", "Sweden"),
        new("AE", "United Arab Emirates"),
        new("US", "United States"),
    ];
}
