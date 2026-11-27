using Mondino.Domain.Teams;

namespace Mondino.Application.SignIn;

/// <summary>
/// A sign-in mail: the address it goes to and the link it carries, and nothing else (L2-050,
/// L2-052). No name, team, city or postal code.
/// </summary>
public sealed record SignInMail(EmailAddress Email, Uri Link);

/// <summary>
/// Where a sign-in mail waits to be sent (docs/adr/0011). Handing a mail over never waits for the
/// Email source, so no answer depends on whether an email is a teammate's or the source is up.
/// </summary>
public interface ISignInMailOutbox
{
    void Enqueue(SignInMail mail);
}
