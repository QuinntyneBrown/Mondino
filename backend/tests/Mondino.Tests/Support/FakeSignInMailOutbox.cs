using System.Collections.Concurrent;
using Mondino.Application.SignIn;

namespace Mondino.Tests.Support;

/// <summary>
/// The outbox sign-in mails leave through, recording each mail it is handed instead of sending it,
/// so a test sees at once whether a mail would have been sent, and to whom.
/// </summary>
public sealed class FakeSignInMailOutbox : ISignInMailOutbox
{
    private readonly ConcurrentQueue<SignInMail> mails = new();

    public IReadOnlyList<SignInMail> Mails => [.. mails];

    public void Enqueue(SignInMail mail) => mails.Enqueue(mail);

    /// <summary>The sign-in token of the last mail sent to <paramref name="email"/>, read from its link's fragment.</summary>
    public string TokenSentTo(string email)
    {
        var mail = Mails.Last(m => m.Email.Value == email);
        return mail.Link.Fragment.TrimStart('#');
    }
}
