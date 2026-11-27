using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Mondino.Application;

public static class DependencyInjection
{
    /// <summary>Handlers, validators and the clock everything on the backend reads.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.TryAddSingleton(TimeProvider.System);
        return services;
    }
}
