using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Mondino.Api.Telemetry;

/// <summary>
/// OpenTelemetry for the API (L2-051, docs/adr/0031): traces, metrics and logs, each passed
/// through <see cref="TelemetryRedaction"/>'s allow-lists before any exporter sees it. The OTLP
/// exporter is added only when <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> is set; without it nothing
/// leaves the process, and every request still has a trace, whose id is the correlation id.
/// </summary>
internal static class MondinoTelemetry
{
    public const string ServiceName = "mondino-api";

    public static IServiceCollection AddMondinoTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        var exports = !string.IsNullOrWhiteSpace(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithTracing(tracing =>
            {
                // No exception events: a span's events cannot be removed once added.
                tracing
                    .AddAspNetCoreInstrumentation(options => options.RecordException = false)
                    .AddHttpClientInstrumentation(options => options.RecordException = false)
                    .AddProcessor(new SpanRedaction());
                if (exports)
                {
                    tracing.AddOtlpExporter();
                }
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddView(_ => new MetricStreamConfiguration { TagKeys = [.. TelemetryRedaction.AllowedMetricTags] });
                if (exports)
                {
                    metrics.AddOtlpExporter();
                }
            })
            .WithLogging(
                logging =>
                {
                    logging.AddProcessor(new LogRedaction());
                    if (exports)
                    {
                        logging.AddOtlpExporter();
                    }
                },
                options =>
                {
                    options.IncludeFormattedMessage = false;
                    options.IncludeScopes = false;
                });

        return services;
    }
}
