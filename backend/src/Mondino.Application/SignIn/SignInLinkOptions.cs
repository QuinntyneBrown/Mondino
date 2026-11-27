namespace Mondino.Application.SignIn;

/// <summary>The settings a sign-in link needs, <c>SignInEmail:*</c> (docs/adr/0011).</summary>
public sealed class SignInLinkOptions
{
    public const string Section = "SignInEmail";

    /// <summary>
    /// The app's own address, the start of every link. Never the request's <c>Host</c>, so a forged
    /// host cannot send a teammate a link to another site. Without it no mail is sent.
    /// </summary>
    public Uri? AppAddress { get; set; }
}
