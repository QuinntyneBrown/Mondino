using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Mondino.Application.Joining;
using Mondino.Application.Teammates;

namespace Mondino.Application;

public static class DependencyInjection
{
    /// <summary>Handlers, validators and the clock everything on the backend reads.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
            configuration.AddOpenBehavior(typeof(TeamScopeBehaviour<,>));
        });
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<TeamJoinGate>();
        return services;
    }
}
