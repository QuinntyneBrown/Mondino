using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;

namespace Mondino.Application.Teammates;

/// <summary>
/// Saves the current teammate's own location from Profile &amp; Settings (L2-032). It names no
/// teammate: the pin moved is always the asker's own, so no request can move another teammate's.
/// Journey 23 adds the settings.
/// </summary>
public sealed record UpdateProfileCommand(Guid TeamId, string? CountryCode, string? PostalCode)
    : IRequest<ProfileDto>, ITeamScopedRequest;

/// <summary>Refuses a country outside the supported list, or a postal code empty or over 12 characters.</summary>
internal static class UpdateProfileCommandValidator
{
    public static void Validate(UpdateProfileCommand command)
    {
        if (PostalCodeFormats.Find(command.CountryCode) is null
            || string.IsNullOrWhiteSpace(command.PostalCode)
            || command.PostalCode.Length > LookUpPostalCodeQueryValidator.MaxLength)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }
    }
}

internal sealed class UpdateProfileCommandHandler(
    IAppDbContext database,
    ICurrentTeammate currentTeammate,
    IPostalCodeLookup lookup,
    ICityDirectory directory,
    IWeatherSource weatherSource)
    : IRequestHandler<UpdateProfileCommand, ProfileDto>
{
    public async Task<ProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        UpdateProfileCommandValidator.Validate(request);

        // 1. The asker's own pin, never one a request names.
        var teammate = await database.Teammates.Include(t => t.City)
            .SingleOrDefaultAsync(t => t.Id == currentTeammate.TeammateId && t.TeamId == request.TeamId, cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        // 2. A location that differs from the stored one is found again by the backend, never taken
        //    from the browser; one that cannot be found or checked is refused and nothing is stored.
        var unchanged = PostalCodeFormats.TryNormalise(request.CountryCode!, request.PostalCode!, out var normalised)
            && teammate.City.CountryCode == normalised.CountryCode
            && teammate.PostalCode == normalised.Value;
        if (!unchanged)
        {
            var (known, postalCode) = await PinCities.FindAsync(
                lookup, directory, request.CountryCode!, request.PostalCode, null, cancellationToken);
            var city = await PinCities.HoldAsync(database, known, cancellationToken);
            teammate.MoveTo(postalCode!, city);
            await database.SaveChangesAsync(cancellationToken);
        }

        return await OwnProfiles.ReadAsync(database, weatherSource, teammate.Id, request.TeamId, cancellationToken);
    }
}
