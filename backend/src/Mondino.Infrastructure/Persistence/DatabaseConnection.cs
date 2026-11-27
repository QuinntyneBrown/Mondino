using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Mondino.Infrastructure.Persistence;

/// <summary>How a connection to PostgreSQL signs in (<c>Database:Authentication</c>, docs/adr/0017).</summary>
internal enum DatabaseAuthentication
{
    /// <summary>The connection string carries whatever it needs, as on a laptop.</summary>
    Password,

    /// <summary>A Microsoft Entra token for the host's own managed identity: the deployed API.</summary>
    ManagedIdentity,

    /// <summary>A Microsoft Entra token for whoever <c>az login</c> signed in: the deployment, or an operator.</summary>
    AzureCli,
}

/// <summary>
/// The connection to PostgreSQL, checked at startup (docs/adr/0017). With an Entra identity the
/// connection string names the host, the database and the role and holds no password, the
/// server's certificate and name are always verified, and each new connection's password is a
/// short-lived token. A setting that breaks this stops the process, with a message that names
/// the setting and never its value.
/// </summary>
internal sealed class DatabaseConnection
{
    private const string ConnectionStringSetting = "ConnectionStrings:Mondino";
    private const string AuthenticationSetting = "Database:Authentication";

    private readonly string connectionString;
    private readonly DatabaseAuthentication authentication;

    private DatabaseConnection(string connectionString, DatabaseAuthentication authentication)
    {
        this.connectionString = connectionString;
        this.authentication = authentication;
    }

    /// <summary>Reads and checks the settings. Nothing is connected to and no token is asked for.</summary>
    public static DatabaseConnection Read(IConfiguration configuration)
    {
        var given = configuration.GetConnectionString("Mondino");
        if (string.IsNullOrWhiteSpace(given))
        {
            throw new InvalidOperationException(
                $"Database:Provider 'PostgreSQL' needs the connection string {ConnectionStringSetting}.");
        }

        NpgsqlConnectionStringBuilder settings;
        try
        {
            settings = new NpgsqlConnectionStringBuilder(given);
        }
        catch (ArgumentException)
        {
            // The error names what was given, which may be a secret: say only which setting it is.
            throw new InvalidOperationException($"{ConnectionStringSetting} is not a PostgreSQL connection string.");
        }

        var authentication = AuthenticationOf(configuration);
        if (authentication == DatabaseAuthentication.Password)
        {
            return new DatabaseConnection(settings.ConnectionString, authentication);
        }

        if (string.IsNullOrWhiteSpace(settings.Host) || string.IsNullOrWhiteSpace(settings.Username))
        {
            throw new InvalidOperationException(
                $"With {AuthenticationSetting} '{authentication}', {ConnectionStringSetting} names the Host and the Username (the database role).");
        }

        if (!string.IsNullOrEmpty(settings.Password) || !string.IsNullOrEmpty(settings.Passfile))
        {
            throw new InvalidOperationException(
                $"With {AuthenticationSetting} '{authentication}', {ConnectionStringSetting} holds no password: the connection signs in with a Microsoft Entra token.");
        }

        // The token is the password, so it travels only to a server whose certificate and name are verified.
        settings.SslMode = SslMode.VerifyFull;
        return new DatabaseConnection(settings.ConnectionString, authentication);
    }

    /// <summary>The source every context opens its connections from; its pool is shared.</summary>
    public NpgsqlDataSource CreateDataSource()
    {
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        if (authentication != DatabaseAuthentication.Password)
        {
            var tokens = EntraDatabaseTokens.For(authentication);
            builder.UsePasswordProvider(_ => tokens.Get(), (_, cancellationToken) => tokens.GetAsync(cancellationToken));
        }

        return builder.Build();
    }

    private static DatabaseAuthentication AuthenticationOf(IConfiguration configuration)
    {
        var given = configuration[AuthenticationSetting];
        if (string.IsNullOrWhiteSpace(given))
        {
            return DatabaseAuthentication.Password;
        }

        // By name only: a number is not one of the values.
        return Enum.TryParse<DatabaseAuthentication>(given, ignoreCase: true, out var authentication)
            && Enum.IsDefined(authentication)
            && !int.TryParse(given, out _)
            ? authentication
            : throw new InvalidOperationException(
                $"{AuthenticationSetting} is not supported. Use '{nameof(DatabaseAuthentication.Password)}', "
                + $"'{nameof(DatabaseAuthentication.ManagedIdentity)}' or '{nameof(DatabaseAuthentication.AzureCli)}'.");
    }
}
