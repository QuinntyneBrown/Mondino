using System.Text.Json.Serialization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Application.Moments;

/// <summary>The moments where a team's teammates live (find-moments). Only a teammate of the team may ask (L2-043).</summary>
public sealed record GetMomentsQuery(Guid TeamId) : IRequest<IReadOnlyList<MomentDto>>, ITeamScopedRequest;

/// <summary>
/// A moment as the teammate it belongs to has it (L2-020): one for each teammate, naming them, with
/// their city's name, country code and time zone, so the browser can tell "today" in the moment's
/// own place. It carries no postal code, no position, and no initials or colour.
/// </summary>
public sealed record MomentDto(
    Guid TeammateId,
    string TeammateName,
    string CityName,
    string CountryCode,
    string TimeZoneId,
    MomentKindName Kind,
    string Title,
    DateOnly Date,
    string Detail,
    string? EmblemKey);

/// <summary>A moment's kind as the web app names it: <c>holiday</c>, <c>formula-1</c>, <c>local-event</c>, <c>sport</c>.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<MomentKindName>))]
public enum MomentKindName
{
    [JsonStringEnumMemberName("holiday")]
    Holiday,

    [JsonStringEnumMemberName("formula-1")]
    Formula1,

    [JsonStringEnumMemberName("local-event")]
    LocalEvent,

    [JsonStringEnumMemberName("sport")]
    Sport,
}

internal sealed class GetMomentsQueryHandler(IAppDbContext database, MomentFinder finder)
    : IRequestHandler<GetMomentsQuery, IReadOnlyList<MomentDto>>
{
    public async Task<IReadOnlyList<MomentDto>> Handle(GetMomentsQuery request, CancellationToken cancellationToken)
    {
        var teammates = await database.Teammates.AsNoTracking()
            .Where(t => t.TeamId == request.TeamId)
            .OrderBy(t => t.JoinedAt)
            .Select(t => new { t.Id, t.Name, t.City })
            .ToListAsync(cancellationToken);

        // Once per city, not once per teammate, the cities side by side.
        var cities = teammates.Select(t => t.City).DistinctBy(city => city.Id).ToList();
        var found = await Task.WhenAll(cities.Select(city => finder.FindForAsync(city, cancellationToken)));
        var momentsOf = cities.Zip(found).ToDictionary(pair => pair.First.Id, pair => pair.Second);

        return teammates
            .SelectMany(t => momentsOf[t.City.Id].Select(moment => To(moment, t.Id, t.Name, t.City)))
            .OrderBy(moment => moment.Date)
            .ToList();
    }

    private static MomentDto To(Moment moment, Guid teammateId, string name, City city) =>
        new(
            teammateId,
            name,
            city.Name,
            city.CountryCode,
            city.TimeZoneId,
            (MomentKindName)moment.Kind,
            moment.Title,
            moment.Date,
            moment.Detail,
            moment.EmblemKey);
}
