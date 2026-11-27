using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teammates;

/// <summary>
/// Saves the current teammate's own location (L2-032) and settings (L2-033, L2-034) from Profile &amp;
/// Settings. Each part is optional, and a part left out is unchanged: a location is a country and a
/// postal code together. It names no teammate: what changes is always the asker's own, so no request
/// can change another teammate's.
/// </summary>
public sealed record UpdateProfileCommand(Guid TeamId, string? CountryCode, string? PostalCode, SettingsUpdate? Settings = null)
    : IRequest<ProfileDto>, ITeamScopedRequest;

/// <summary>
/// Refuses a location given in part, a country outside the supported list, a postal code empty or
/// over 12 characters, and settings with a field left out, a value outside its list or a kind named
/// twice.
/// </summary>
internal static class UpdateProfileCommandValidator
{
    public static void Validate(UpdateProfileCommand command)
    {
        if (HasLocation(command)
            && (PostalCodeFormats.Find(command.CountryCode) is null
                || string.IsNullOrWhiteSpace(command.PostalCode)
                || command.PostalCode.Length > LookUpPostalCodeQueryValidator.MaxLength))
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        if (command.Settings is { } settings && ToSettings(settings) is null)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }
    }

    public static bool HasLocation(UpdateProfileCommand command) => command.CountryCode is not null || command.PostalCode is not null;

    /// <summary>The settings a save sent, or null when one is left out, outside its list or named twice.</summary>
    public static TeammateSettings? ToSettings(SettingsUpdate settings) =>
        settings is
        {
            TemperatureUnit: { } unit,
            ClockFormat: { } clock,
            MomentKinds: { } kinds,
            SharesWeather: { } sharesWeather,
            SharesStatus: { } sharesStatus,
        }
        && Enum.IsDefined(unit)
        && Enum.IsDefined(clock)
        && kinds.All(Enum.IsDefined)
        && kinds.Distinct().Count() == kinds.Count
            ? new TeammateSettings(
                (TemperatureUnit)unit,
                (ClockFormat)clock,
                kinds.Select(kind => (MomentKind)kind),
                sharesWeather,
                sharesStatus)
            : null;
}

internal sealed class UpdateProfileCommandHandler(
    IAppDbContext database,
    ICurrentTeammate currentTeammate,
    IPostalCodeLookup lookup,
    ICityDirectory directory,
    IWeatherSource weatherSource,
    TimeProvider time)
    : IRequestHandler<UpdateProfileCommand, ProfileDto>
{
    public async Task<ProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        UpdateProfileCommandValidator.Validate(request);

        // 1. The asker's own pin, never one a request names.
        var teammate = await database.Teammates.Include(t => t.City)
            .SingleOrDefaultAsync(t => t.Id == currentTeammate.TeammateId && t.TeamId == request.TeamId, cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        // The lookup and the weather of the answer wait 6 seconds at most between them (docs/adr/0026).
        using var deadline = new SourceDeadline(time, cancellationToken);

        // 2. A location that differs from the stored one is found again by the backend, never taken
        //    from the browser; one that cannot be found or checked is refused and nothing is stored,
        //    the settings sent with it included.
        if (UpdateProfileCommandValidator.HasLocation(request))
        {
            var unchanged = PostalCodeFormats.TryNormalise(request.CountryCode!, request.PostalCode!, out var normalised)
                && teammate.City.CountryCode == normalised.CountryCode
                && teammate.PostalCode == normalised.Value;
            if (!unchanged)
            {
                var (known, postalCode) = await PinCities.FindAsync(
                    lookup, directory, request.CountryCode!, request.PostalCode, null, cancellationToken);
                var city = await PinCities.HoldAsync(database, known, cancellationToken);
                teammate.MoveTo(postalCode!, city);
            }
        }

        // 3. The settings, replaced whole (L2-033, L2-034).
        if (request.Settings is { } settings)
        {
            teammate.ChangeSettings(UpdateProfileCommandValidator.ToSettings(settings)!);
        }

        // 4. One unit of work.
        await database.SaveChangesAsync(cancellationToken);
        return await OwnProfiles.ReadAsync(database, weatherSource, teammate.Id, request.TeamId, cancellationToken, deadline);
    }
}
