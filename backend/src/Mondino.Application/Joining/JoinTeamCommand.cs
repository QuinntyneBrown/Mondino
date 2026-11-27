using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Domain.Teams;

namespace Mondino.Application.Joining;

/// <summary>
/// Joins the team of an invite link with a name and a pin at a city (L2-005): the city of a postal
/// code, or a city chosen from "Your city" while the lookup is down (L2-004).
/// </summary>
public sealed record JoinTeamCommand(
    string InviteToken,
    string? Name,
    string? CountryCode,
    string? PostalCode,
    string? CityId,
    Guid? JoinRequestId) : IRequest<JoinOutcome>;

/// <summary>The team and the teammate a join made, or found already made. Never a postal code.</summary>
public sealed record JoinResultDto(Guid TeamId, Guid TeammateId);

/// <summary>What a join came to: its result, and whether this request made the teammate.</summary>
public sealed record JoinOutcome(JoinResultDto Result, bool IsNew);

/// <summary>
/// Refuses, after the name is normalised, an empty name or one over 60 characters, a country
/// outside the supported list, a postal code over 12 characters, neither or both of a postal code
/// and a city id, and a missing join request id (L2-044).
/// </summary>
internal static class JoinTeamCommandValidator
{
    public const int MaxNameLength = 60;

    public static void Validate(string name, JoinTeamCommand command)
    {
        var hasPostalCode = !string.IsNullOrWhiteSpace(command.PostalCode);
        var hasCityId = !string.IsNullOrWhiteSpace(command.CityId);
        if (name.Length == 0
            || name.Length > MaxNameLength
            || PostalCodeFormats.Find(command.CountryCode) is null
            || hasPostalCode == hasCityId
            || (hasPostalCode && command.PostalCode!.Length > LookUpPostalCodeQueryValidator.MaxLength)
            || command.JoinRequestId is null
            || command.JoinRequestId == Guid.Empty)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }
    }
}

internal sealed class JoinTeamCommandHandler(
    IAppDbContext database,
    IPostalCodeLookup lookup,
    ICityDirectory directory,
    TeamJoinGate gate,
    TimeProvider time) : IRequestHandler<JoinTeamCommand, JoinOutcome>
{
    public async Task<JoinOutcome> Handle(JoinTeamCommand request, CancellationToken cancellationToken)
    {
        var name = NameNormaliser.Normalise(request.Name);
        JoinTeamCommandValidator.Validate(name, request);
        var joinRequestId = request.JoinRequestId!.Value;

        using var _ = await gate.EnterAsync(request.InviteToken, cancellationToken);

        // 1. The team of the invite link, with its teammates.
        var team = await database.Teams
            .Include(t => t.Teammates)
            .SingleOrDefaultAsync(t => t.InviteToken == request.InviteToken, cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.InviteNotFound);

        // 2. A repeated request (a double-click, a retry whose answer was lost) adds no one.
        if (team.Teammates.FirstOrDefault(t => t.JoinRequestId == joinRequestId) is { } existing)
        {
            return new JoinOutcome(new JoinResultDto(team.Id, existing.Id), IsNew: false);
        }

        // 3. The city, found again by the backend: the browser's word for it is not trusted.
        var (known, postalCode) = await FindCityAsync(request, cancellationToken);
        var city = await database.Cities.SingleOrDefaultAsync(c => c.DirectoryId == known.CityId, cancellationToken);
        if (city is null)
        {
            city = new City(
                Guid.NewGuid(),
                known.Name,
                known.CountryCode,
                new Position(known.Latitude, known.Longitude),
                known.TimeZoneId,
                known.CityId);
            database.Cities.Add(city);
        }

        // 4. The teammate, with a colour of the palette, at the city.
        Teammate teammate;
        try
        {
            teammate = team.AddTeammate(
                name, postalCode, city, PinColourPicker.Pick(team), joinRequestId, time.GetUtcNow());
        }
        catch (TeamFullException)
        {
            throw new RefusedException(409, ErrorCodes.TeamFull);
        }

        // 5. One unit of work. 6. Another instance that made the teammate first wins the unique index.
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            var made = await database.Teammates.AsNoTracking()
                .SingleOrDefaultAsync(t => t.TeamId == team.Id && t.JoinRequestId == joinRequestId, cancellationToken);
            if (made is null)
            {
                throw;
            }

            return new JoinOutcome(new JoinResultDto(team.Id, made.Id), IsNew: false);
        }

        return new JoinOutcome(new JoinResultDto(team.Id, teammate.Id), IsNew: true);
    }

    private async Task<(KnownCity City, string? PostalCode)> FindCityAsync(
        JoinTeamCommand request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request.CityId))
        {
            var chosen = directory.Find(request.CityId);
            return chosen is not null && chosen.CountryCode == request.CountryCode
                ? (chosen, null)
                : throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        if (!PostalCodeFormats.TryNormalise(request.CountryCode!, request.PostalCode!, out var postalCode))
        {
            throw new RefusedException(422, ErrorCodes.PostalCodeNotFound);
        }

        var outcome = await lookup.FindCityAsync(postalCode, cancellationToken);
        return outcome.Status switch
        {
            PostalCodeLookupStatus.Found => (outcome.City!, postalCode.Value),
            PostalCodeLookupStatus.NotFound => throw new RefusedException(422, ErrorCodes.PostalCodeNotFound),
            _ => throw new RefusedException(503, ErrorCodes.PostalCodeUnavailable),
        };
    }
}
