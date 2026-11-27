using System.Threading.Channels;
using Mondino.Application.SignIn;

namespace Mondino.Infrastructure.SignIn;

/// <summary>
/// The sign-in mails waiting to be sent: a bounded channel of 1,000 that drops the newest when full,
/// so it holds no more memory however many are asked for (docs/adr/0011). Mails waiting when the
/// process stops are lost; the teammate asks again.
/// </summary>
internal sealed class SignInMailOutbox : ISignInMailOutbox
{
    public const int Capacity = 1_000;

    private readonly Channel<SignInMail> mails = Channel.CreateBounded<SignInMail>(
        new BoundedChannelOptions(Capacity) { FullMode = BoundedChannelFullMode.DropWrite, SingleReader = true });

    public ChannelReader<SignInMail> Reader => mails.Reader;

    public void Enqueue(SignInMail mail) => mails.Writer.TryWrite(mail);
}
