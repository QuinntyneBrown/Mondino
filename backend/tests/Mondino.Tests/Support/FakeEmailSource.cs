using System.Net;
using System.Text;
using System.Threading.Channels;

namespace Mondino.Tests.Support;

/// <summary>What the Email source was sent: the request's address, its headers and its body as text.</summary>
public sealed record SentEmail(Uri Address, IReadOnlyDictionary<string, string> Headers, string Body);

/// <summary>
/// The outside Email source (Postmark, docs/adr/0011) at the HTTP boundary, answering as the test
/// tells it: accepted, refused, or no answer until the call is cancelled. It records every request.
/// </summary>
public sealed class FakeEmailSource : HttpMessageHandler
{
    private readonly Channel<SentEmail> sent = Channel.CreateUnbounded<SentEmail>();
    private readonly Channel<bool> cancelled = Channel.CreateUnbounded<bool>();
    private int calls;

    public SourceBehaviour Behaviour { get; set; } = SourceBehaviour.Answers;

    /// <summary>How many requests the source was sent.</summary>
    public int Calls => Volatile.Read(ref calls);

    /// <summary>The next request the source is sent, or a failure naming how many it had.</summary>
    public async Task<SentEmail> NextAsync()
    {
        try
        {
            return await sent.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        }
        catch (TimeoutException)
        {
            throw new TimeoutException($"The Email source was not sent a mail; it had {Calls} requests.");
        }
    }

    /// <summary>Completes when a call the source was holding is cancelled by its caller.</summary>
    public async Task CancelledAsync()
    {
        try
        {
            await cancelled.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        }
        catch (TimeoutException)
        {
            throw new TimeoutException($"No call to the Email source was cancelled; it had {Calls} requests.");
        }
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref calls);
        var headers = request.Headers.Concat(request.Content?.Headers ?? Enumerable.Empty<KeyValuePair<string, IEnumerable<string>>>())
            .ToDictionary(header => header.Key, header => string.Join(',', header.Value), StringComparer.OrdinalIgnoreCase);
        var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
        await sent.Writer.WriteAsync(new SentEmail(request.RequestUri!, headers, body), cancellationToken);

        switch (Behaviour)
        {
            case SourceBehaviour.Hangs:
                try
                {
                    // Waits for the caller to give up; never a sleep.
                    await Task.Delay(Timeout.Infinite, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    await cancelled.Writer.WriteAsync(true, CancellationToken.None);
                    throw;
                }

                throw new OperationCanceledException(cancellationToken);
            case SourceBehaviour.Fails:
                return new HttpResponseMessage(HttpStatusCode.UnprocessableEntity)
                {
                    Content = new StringContent("""{"ErrorCode":300,"Message":"Invalid email request"}""", Encoding.UTF8, "application/json"),
                };
            default:
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"ErrorCode":0,"Message":"OK","MessageID":"b7bc2f4a-e38e-4336-af7d-e6c392c2f817"}""", Encoding.UTF8, "application/json"),
                };
        }
    }

    protected override void Dispose(bool disposing)
    {
        sent.Writer.TryComplete();
        cancelled.Writer.TryComplete();
        base.Dispose(disposing);
    }
}
