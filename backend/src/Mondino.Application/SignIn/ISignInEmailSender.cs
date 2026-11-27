namespace Mondino.Application.SignIn;

/// <summary>
/// The outside source that delivers sign-in mails (docs/adr/0011). It is given the address and the
/// link and nothing else (L2-050), and answers whether it accepted the message.
/// </summary>
public interface ISignInEmailSender
{
    Task<bool> SendAsync(SignInMail mail, CancellationToken cancellationToken);
}
