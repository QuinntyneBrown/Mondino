namespace Mondino.Infrastructure.SignIn;

/// <summary>The Email source's settings, <c>SignInEmail:*</c> (docs/adr/0011). Without a token or a sender, no mail is sent.</summary>
public sealed class SignInEmailOptions
{
    public const string Section = "SignInEmail";

    /// <summary>The Postmark server token. A secret.</summary>
    public string? ServerToken { get; set; }

    /// <summary>The sender: a sender signature or a verified domain in Postmark.</summary>
    public string? From { get; set; }

    public Uri BaseAddress { get; set; } = new("https://api.postmarkapp.com/");
}
