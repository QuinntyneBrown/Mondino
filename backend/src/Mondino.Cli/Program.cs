using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Mondino.Application;
using Mondino.Infrastructure;

namespace Mondino.Cli;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        // Settings come from appsettings.json and the environment, as the API's do.
        var builder = Host.CreateApplicationBuilder();
        builder.Services.AddApplication();
        builder.Services.AddInfrastructure(builder.Configuration);
        using var host = builder.Build();

        using var cancellation = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            cancellation.Cancel();
        };

        return await Commands.RunAsync(args, host.Services, Console.Out, cancellation.Token);
    }
}
