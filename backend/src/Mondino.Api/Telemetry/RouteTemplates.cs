using System.Text.RegularExpressions;

namespace Mondino.Api.Telemetry;

/// <summary>
/// A route as telemetry records it (L2-051): from the root, with each parameter named and nothing
/// else, so <c>api/teams/{teamId:guid}/pins</c> is <c>/api/teams/{teamId}/pins</c>.
/// </summary>
internal static partial class RouteTemplates
{
    public static string Normalise(string template)
    {
        ArgumentNullException.ThrowIfNull(template);
        var named = Parameter().Replace(template, match => $"{{{match.Groups["catchAll"].Value}{match.Groups["name"].Value}}}");
        return named.StartsWith('/') ? named : "/" + named;
    }

    /// <summary>A parameter, its catch-all stars and its name, then any constraint, default or optional mark.</summary>
    [GeneratedRegex(@"\{(?<catchAll>\*{0,2})(?<name>[^:=?}]+)[^}]*\}")]
    private static partial Regex Parameter();
}
