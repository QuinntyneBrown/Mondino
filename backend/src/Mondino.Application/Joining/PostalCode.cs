namespace Mondino.Application.Joining;

/// <summary>
/// A postal code that fits its country's form, in the country's canonical spelling ("L5B 3C1"),
/// and the part of it that names an area, which is all the source is given ("L5B").
/// </summary>
public sealed record PostalCode(string CountryCode, string Value, string ForSource);
