using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Mondino.Application.SignIn;

namespace Mondino.Infrastructure.SignIn;

/// <summary>
/// The Email source: Postmark's HTTP API (docs/adr/0011). It is given the address and the link and
/// nothing else (L2-050), as plain text, with open and link tracking off so the link is never
/// rewritten through Postmark's domain. A call has 5 seconds; after 5 failures in a row the breaker
/// opens for 30 seconds and nothing is sent. Its client logs nothing: its body carries the link.
/// </summary>
internal sealed class PostmarkSignInEmailSender(
    IHttpClientFactory clients,
    IOptions<SignInEmailOptions> options,
    TimeProvider time) : ISignInEmailSender
{
    public const string ClientName = "email-source";
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan BreakerOpenFor = TimeSpan.FromSeconds(30);
    public const int FailuresToOpen = 5;

    public const string Subject = "Your Mondino sign-in link";

    /// <summary>Postmark's fields are named as written: <c>From</c>, <c>To</c>, <c>TextBody</c>.</summary>
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = null };

    private readonly Lock gate = new();
    private int failures;
    private DateTimeOffset openUntil = DateTimeOffset.MinValue;

    public async Task<bool> SendAsync(SignInMail mail, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(mail);
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ServerToken) || string.IsNullOrWhiteSpace(settings.From))
        {
            return false;
        }

        lock (gate)
        {
            if (time.GetUtcNow() < openUntil)
            {
                return false;
            }
        }

        var accepted = false;
        using (var timeout = new CancellationTokenSource(Timeout, time))
        using (var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token))
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(settings.BaseAddress, "email"))
                {
                    Content = JsonContent.Create(new Message(
                        settings.From,
                        mail.Email.Value,
                        Subject,
                        TextOf(mail.Link),
                        "outbound",
                        TrackOpens: false,
                        TrackLinks: "None"),
                        options: Json),
                };
                request.Headers.Add("X-Postmark-Server-Token", settings.ServerToken);
                request.Headers.Add("Accept", "application/json");
                using var response = await clients.CreateClient(ClientName).SendAsync(request, linked.Token);
                accepted = response.IsSuccessStatusCode;
            }
            catch (OperationCanceledException) when (timeout.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                accepted = false;
            }
            catch (HttpRequestException)
            {
                accepted = false;
            }
        }

        Record(accepted);
        return accepted;
    }

    /// <summary>The message, in the screen's own words: the link, that it works once and for 15 minutes.</summary>
    private static string TextOf(Uri link) =>
        "Here is your link to sign in to Mondino. It works once, for the next 15 minutes.\n\n"
        + link.AbsoluteUri
        + "\n\nIf you didn’t ask for it, you can ignore this email.\n";

    private void Record(bool accepted)
    {
        lock (gate)
        {
            if (accepted)
            {
                failures = 0;
            }
            else if (++failures >= FailuresToOpen)
            {
                openUntil = time.GetUtcNow() + BreakerOpenFor;
                failures = 0;
            }
        }
    }

    /// <summary>Postmark's message: these fields and no others.</summary>
    private sealed record Message(
        string From,
        string To,
        string Subject,
        string TextBody,
        string MessageStream,
        bool TrackOpens,
        string TrackLinks);
}
