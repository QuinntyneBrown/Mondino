# 0031: Telemetry is kept from an allow-list, exported over OTLP only when an endpoint is set, and the outside sources measure themselves

**Status:** Accepted (journey 30, Observe without exposing). Changes the name of the correlation
id that [ADR 0003](0003-backend-baseline.md) gave unexpected errors.

## Context

L2-051 asks for OpenTelemetry traces, metrics and logs, enough to see the backend's health and
each outside source's, with no name, email, postal code, position, city, token, query string or
body in any of them, and every route recorded as its template. `observe-without-exposing` drew a
`MondinoTelemetry` in `Mondino.Api` that the caching decorators call, but the decorators are in
`Mondino.Infrastructure`, which may not depend on `Mondino.Api`. It drew a
`CachedMomentCalendars` over three calendars, which was never built: holidays come from
OpenHolidays through `CachedOpenHolidays`, and Formula 1, local events and sport from Mondino's
own calendar, built in, with no call (ADR 0019). It asked for the EF Core instrumentation, whose
package is still a prerelease. And the backend logs nothing of its own yet: there is no join or
sign-in log line to redact. The product that receives the telemetry and the sampling rate are
`<TO SUPPLY>`.

## Decision

- **The OpenTelemetry SDK 1.21, with the ASP.NET Core and `HttpClient` instrumentation and the
  OTLP exporter**, set up by `MondinoTelemetry.AddMondinoTelemetry` in `Mondino.Api`. The service
  is named `mondino-api`. The exporter is added only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set;
  without it the SDK still runs (so every request has a trace and a correlation id) and nothing
  leaves the process. The exporter reads the standard `OTEL_EXPORTER_OTLP_*` variables, and the
  sampler the standard `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`; with neither, every
  trace is kept (parent-based, always on). No database instrumentation: the EF Core package is a
  prerelease, its spans would carry statement text the allow-list then drops, and readiness
  already says whether the database can be reached.
- **What is kept is named; everything else is dropped.** `TelemetryRedaction` holds three
  allow-lists, applied to every signal before any exporter sees it:
  - *Span attributes*: `http.request.method`, `http.response.status_code`, `http.route`,
    `error.type`, `server.address` (an outside source's host), `mondino.source` and
    `mondino.source.outcome`. `SpanRedaction`, the first span processor, removes every other
    attribute (the path, the query, the outgoing URL, the client address, the user agent), the
    status description, the trace state and the baggage, and names an HTTP span by its method
    and, for a server span, its route template. A span's events cannot be removed once added, so
    no instrumentation records one: the exception events stay off.
  - *Log attributes*: the message template (`{OriginalFormat}`), `errorType` and
    `correlationId`. `LogRedaction`, the first log processor, removes every other attribute, the
    formatted message, a body that is not a template, and the exception, of which only its type
    is kept. Scopes are not exported.
  - *Metric tags*: the span attributes' HTTP names, `server.address`, `source` and `outcome`,
    applied as a view on every instrument.
- **A span's route is written from the root with each parameter named and nothing else**
  (`RouteTemplates`): `api/teams/{teamId:guid}/pins` is `/api/teams/{teamId}/pins`, as L2-051
  writes it. A metric's `http.route` is set by ASP.NET Core's own meter, which no processor can
  rewrite, so it stays the template as declared, `api/teams/{teamId:guid}/pins`: a template
  either way, with no value in it.
- **The outside sources measure themselves, in `Mondino.Infrastructure`.** `SourceTelemetry`
  owns the `Meter` and the `ActivitySource`, both named `Mondino` (the meter from
  `IMeterFactory`). `CachedPostalCodeLookup`, `CachedWeatherSource`, `CachedOpenHolidays` and
  `PostmarkSignInEmailSender` start one `SourceCall` per call, which ends with a `SourceOutcome`:
  `success`, `failure`, `timeout`, or `circuit_open` when the breaker (ADR 0026) left the source
  alone. It counts the call in `mondino.source.calls` and, for a call that was made, records its
  duration in seconds, read from `TimeProvider`, in `mondino.source.duration`; both are labelled
  by `source` (`postal_code`, `weather`, `holiday_calendar`, `email`) and `outcome` and nothing
  else. Each call made is also a span, `source <name>`, with the same two attributes. Mondino's
  own calendar makes no call and is not measured. `MondinoTelemetry` subscribes to both by name.
- **One correlation id, the trace id.** Every ProblemDetails carries `correlationId`, the
  request's W3C trace id, in place of the framework's `traceId`. An unhandled error is caught by
  `UnhandledExceptionHandler`, which logs `UnhandledError` (the error's type and the correlation
  id, through the source-generated `LogMessages`) and answers 500 with the code `unexpected`;
  the framework's own log of a handled error is not written (.NET 10's default).

## Consequences

- An attribute a new instrumentation version adds is dropped until it is named here, so an
  upgrade cannot widen what is exported unseen.
- A deployment that sets no endpoint exports nothing and runs as before; the operator sets
  `OTEL_EXPORTER_OTLP_ENDPOINT` (and, if the product needs them, `OTEL_EXPORTER_OTLP_HEADERS`
  and `OTEL_EXPORTER_OTLP_PROTOCOL`) once the product is chosen.
- The database's latency is not traced; slow queries are seen only in the server spans of the
  routes that make them.
- In the tests the outside sources are fake message handlers, which the `HttpClient`
  instrumentation does not see; `SourceTelemetry`'s spans and metrics are what the acceptance
  tests read, and `SpanRedaction` is also tested on its own against an outgoing call's tags.

## Alternatives considered

- *The instruments in `Mondino.Api`, as drawn.* The decorators could reach them only through an
  interface in `Mondino.Application`, for something no handler uses; the instruments sit with the
  decorators that record them.
- *A deny-list of known personal attributes.* Every instrumentation release could add one.
- *Always adding the OTLP exporter.* With no endpoint it sends to `localhost:4317` and retries
  every batch.
- *Keeping `traceId`.* It is the framework's `Activity.Id`, which joins the trace id to a span
  id; the trace id alone is what the telemetry product searches by.
