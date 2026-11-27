using Microsoft.Extensions.Hosting;
using Mondino.Application.SignIn;

namespace Mondino.Infrastructure.SignIn;

/// <summary>
/// Hands each mail in the outbox to the Email source, one at a time, after the request that asked
/// for it has been answered (docs/adr/0011). A mail the source does not accept is dropped; the
/// teammate asks again. It logs nothing of a mail: neither the address nor the link.
/// </summary>
internal sealed class SignInMailDispatcher(SignInMailOutbox outbox, ISignInEmailSender sender) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var mail in outbox.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await sender.SendAsync(mail, stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    // Dropped: the answer was given long ago, and the teammate can ask again.
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The process is stopping; mails still waiting are lost.
        }
    }
}
