using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;

namespace Mondino.Application.Joining;

/// <summary>
/// Searches the cities Mondino holds, for "Your city" while the postal code lookup is down
/// (L2-004). It calls no outside source. The invite token is absent when Create Team asks.
/// </summary>
public sealed record SearchCitiesQuery(string? InviteToken, string? CountryCode, string? Text)
    : IRequest<IReadOnlyList<CityResultDto>>;

/// <summary>A city to choose: its id, and the city as a looked-up postal code gives it.</summary>
public sealed record CityResultDto(string CityId, CityDto City);

internal sealed class SearchCitiesQueryHandler(IAppDbContext database, ICityDirectory directory)
    : IRequestHandler<SearchCitiesQuery, IReadOnlyList<CityResultDto>>
{
    public const int MaxResults = 8;
    public const int MaxTextLength = 60;

    public async Task<IReadOnlyList<CityResultDto>> Handle(SearchCitiesQuery request, CancellationToken cancellationToken)
    {
        if (PostalCodeFormats.Find(request.CountryCode) is null
            || string.IsNullOrWhiteSpace(request.Text)
            || request.Text.Length > MaxTextLength)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        if (request.InviteToken is not null
            && !await database.Teams.AnyAsync(team => team.InviteToken == request.InviteToken, cancellationToken))
        {
            throw RefusedException.NotFound(ErrorCodes.InviteNotFound);
        }

        return directory.Search(request.CountryCode!, request.Text, MaxResults)
            .Select(city => new CityResultDto(city.CityId, CityDto.From(city)))
            .ToList();
    }
}
