using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>
/// Makes a team whose first teammate is its maker, with a pin at the city of their postal code,
/// or at a city chosen from "Your city" while the lookup is down (L2-053).
/// </summary>
public sealed record CreateTeamCommand(
    string? TeamName,
    string? Name,
    string? Email,
    string? CountryCode,
    string? PostalCode,
    string? CityId,
    Guid? CreateRequestId) : IRequest<CreateTeamOutcome>;

/// <summary>The team made and its maker, by random ids, and its invite token. Never an email or a postal code.</summary>
public sealed record CreatedTeamDto(Guid TeamId, Guid TeammateId, string TeamName, string InviteToken);

/// <summary>What a request to make a team came to, and whether this request made it.</summary>
public sealed record CreateTeamOutcome(CreatedTeamDto Result, bool IsNew);

/// <summary>
/// Refuses, after the names are normalised, a team name or a name that is empty or over 60
/// characters, an email not in the form of an address or over 254 characters, a country outside
/// the supported list, a postal code over 12 characters, neither or both of a postal code and a
/// city id, and a missing request id (L2-044, docs/adr/0009).
/// </summary>
internal static class CreateTeamCommandValidator
{
    public const int MaxNameLength = 60;

    public static EmailAddress Validate(string teamName, string name, CreateTeamCommand command)
    {
        var hasPostalCode = !string.IsNullOrWhiteSpace(command.PostalCode);
        var hasCityId = !string.IsNullOrWhiteSpace(command.CityId);
        if (teamName.Length is 0 or > MaxNameLength
            || name.Length is 0 or > MaxNameLength
            || !EmailAddress.TryParse(command.Email, out var email)
            || PostalCodeFormats.Find(command.CountryCode) is null
            || hasPostalCode == hasCityId
            || (hasPostalCode && command.PostalCode!.Length > LookUpPostalCodeQueryValidator.MaxLength)
            || command.CreateRequestId is null
            || command.CreateRequestId == Guid.Empty)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        return email!;
    }
}

internal sealed class CreateTeamCommandHandler(
    IAppDbContext database,
    IPostalCodeLookup lookup,
    ICityDirectory directory,
    IInviteTokens inviteTokens,
    IEmailFingerprints fingerprints,
    TeamJoinGate gate,
    TimeProvider time) : IRequestHandler<CreateTeamCommand, CreateTeamOutcome>
{
    public async Task<CreateTeamOutcome> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
    {
        var teamName = NameNormaliser.Normalise(request.TeamName);
        var name = NameNormaliser.Normalise(request.Name);
        var email = CreateTeamCommandValidator.Validate(teamName, name, request);
        var createRequestId = request.CreateRequestId!.Value;

        // One request id at a time, so a double-click makes one team.
        using var _ = await gate.EnterAsync(createRequestId.ToString(), cancellationToken);

        // 1. A repeated request (a double-click, a retry whose answer was lost) makes nothing.
        if (await MadeAsync(createRequestId, cancellationToken) is { } made)
        {
            return new CreateTeamOutcome(made, IsNew: false);
        }

        // 2. The city, found by the backend.
        var (known, postalCode) = await PinCities.FindAsync(
            lookup, directory, request.CountryCode!, request.PostalCode, request.CityId, cancellationToken);
        var fingerprint = fingerprints.FingerprintOf(email);
        var city = await PinCities.HoldAsync(database, known, cancellationToken);

        // 3. The team, with a new invite token. 4. Its maker, at the city, with a colour.
        var team = Team.Create(teamName, inviteTokens.Create(), createRequestId);
        var maker = team.AddTeammate(name, postalCode, city, PinColourPicker.Pick(team, city), createRequestId, time.GetUtcNow());
        maker.SetEmailFingerprint(fingerprint);
        database.Teams.Add(team);

        // 5. One unit of work. Another instance that made the team first wins the unique index.
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return await MadeAsync(createRequestId, cancellationToken) is { } other
                ? new CreateTeamOutcome(other, IsNew: false)
                : throw new InvalidOperationException("The team could not be saved.");
        }

        return new CreateTeamOutcome(new CreatedTeamDto(team.Id, maker.Id, team.Name, team.InviteToken), IsNew: true);
    }

    private async Task<CreatedTeamDto?> MadeAsync(Guid createRequestId, CancellationToken cancellationToken) =>
        await database.Teams.AsNoTracking()
            .Where(t => t.CreateRequestId == createRequestId)
            .Select(t => new CreatedTeamDto(
                t.Id,
                t.Teammates.OrderBy(m => m.JoinedAt).Select(m => m.Id).First(),
                t.Name,
                t.InviteToken))
            .SingleOrDefaultAsync(cancellationToken);
}
