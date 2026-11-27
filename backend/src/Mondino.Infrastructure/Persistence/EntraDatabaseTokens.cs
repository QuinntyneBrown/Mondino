using Azure.Core;
using Azure.Identity;

namespace Mondino.Infrastructure.Persistence;

/// <summary>
/// The Microsoft Entra tokens PostgreSQL accepts in place of a password (docs/adr/0017). The
/// credential is named by the setting, never discovered, so the same build signs in the same way
/// wherever it runs. A token is asked for when a connection is opened, and is never logged.
/// </summary>
internal sealed class EntraDatabaseTokens(TokenCredential credential)
{
    /// <summary>The audience of Azure Database for PostgreSQL.</summary>
    public const string Scope = "https://ossrdbms-aad.database.windows.net/.default";

    private static readonly TokenRequestContext Request = new([Scope]);

    public static EntraDatabaseTokens For(DatabaseAuthentication authentication) => new(authentication switch
    {
        DatabaseAuthentication.ManagedIdentity => new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned),
        DatabaseAuthentication.AzureCli => new AzureCliCredential(),
        _ => throw new ArgumentOutOfRangeException(nameof(authentication)),
    });

    public string Get() => credential.GetToken(Request, CancellationToken.None).Token;

    public async ValueTask<string> GetAsync(CancellationToken cancellationToken) =>
        (await credential.GetTokenAsync(Request, cancellationToken)).Token;
}
