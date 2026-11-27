using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Mondino.Application.Joining;

namespace Mondino.Application;

public static class DependencyInjection
{
    /// <summary>Handlers, validators and the clock everything on the backend reads.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<TeamJoinGate>();
        return services;
    }
}
