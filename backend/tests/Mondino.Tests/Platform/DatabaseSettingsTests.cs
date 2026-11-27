// Acceptance Test
// Traces to: L2-057
// Description: A deployed backend reaches PostgreSQL without a password, and a database setting that breaks that stops it at startup without showing a value

using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Tests.Support;
using Npgsql;

namespace Mondino.Tests.Platform;

public sealed class DatabaseSettingsTests
{
    private const string Passwordless = "Host=mondino.example.test;Database=mondino;Username=mondino_app";

    private static MondinoApi PostgreSql(string? connectionString, string? authentication)
    {
        var api = new MondinoApi();
        api.Settings["Database:Provider"] = "PostgreSQL";
        if (connectionString is not null)
        {
            api.Settings["ConnectionStrings:Mondino"] = connectionString;
        }

        if (authentication is not null)
        {
            api.Settings["Database:Authentication"] = authentication;
        }

        return api;
    }

    [Theory]
    [InlineData("ManagedIdentity")]
    [InlineData("AzureCli")]
    [InlineData("managedidentity")]
    public async Task With_an_Entra_identity_and_no_password_the_backend_starts_and_opens_no_connection_to_do_so(string authentication)
    {
        // Given PostgreSQL, an Entra identity, and a connection string that holds no password
        await using var api = PostgreSql(Passwordless, authentication);
        using var client = api.CreateClient();

        // When the backend starts and its liveness is asked
        using var response = await client.GetAsync("/health/live");

        // Then it is running: starting it asked for no token and opened no connection
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("ManagedIdentity", Passwordless)]
    [InlineData("AzureCli", Passwordless)]
    [InlineData("ManagedIdentity", Passwordless + ";SSL Mode=Disable")]
    [InlineData("AzureCli", Passwordless + ";SSL Mode=Prefer;Trust Server Certificate=true")]
    public async Task With_an_Entra_identity_the_connection_always_verifies_the_server_whatever_the_string_asks(string authentication, string connectionString)
    {
        // Given PostgreSQL and an Entra identity, with a connection string that may ask for less
        await using var api = PostgreSql(connectionString, authentication);
        using var client = api.CreateClient();

        // When the backend's connections are made ready
        var settings = new NpgsqlConnectionStringBuilder(api.Services.GetRequiredService<NpgsqlDataSource>().ConnectionString);

        // Then they use TLS and verify the server's certificate and name, and carry no password
        Assert.Equal(SslMode.VerifyFull, settings.SslMode);
        Assert.Null(settings.Password);
    }

    [Theory]
    [InlineData("ManagedIdentity")]
    [InlineData("AzureCli")]
    public async Task With_an_Entra_identity_a_connection_string_that_holds_a_password_stops_the_backend_without_showing_it(string authentication)
    {
        // Given PostgreSQL and an Entra identity, but a connection string that holds a password
        await using var api = PostgreSql(Passwordless + ";Password=correct-horse-battery", authentication);

        // When the backend starts
        var refusal = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        // Then it stops, names the setting, and shows nothing of its value
        Assert.Contains("ConnectionStrings:Mondino", refusal.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("correct-horse-battery", refusal.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("mondino.example.test", refusal.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Database=mondino;Username=mondino_app")]
    [InlineData("Host=mondino.example.test;Database=mondino")]
    public async Task With_an_Entra_identity_a_connection_string_without_a_host_or_a_role_stops_the_backend(string connectionString)
    {
        // Given PostgreSQL and an Entra identity, but a connection string that names no host, or no role
        await using var api = PostgreSql(connectionString, "ManagedIdentity");

        // When the backend starts
        var refusal = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        // Then it stops and names the setting
        Assert.Contains("ConnectionStrings:Mondino", refusal.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_way_of_signing_in_the_backend_does_not_know_stops_it_and_names_the_setting()
    {
        // Given PostgreSQL and a Database:Authentication the backend does not have
        await using var api = PostgreSql(Passwordless, "Kerberos");

        // When the backend starts
        var refusal = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        // Then it stops and names the setting and the values it takes
        Assert.Contains("Database:Authentication", refusal.Message, StringComparison.Ordinal);
        Assert.Contains("ManagedIdentity", refusal.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_connection_string_that_cannot_be_read_stops_the_backend_without_showing_it()
    {
        // Given PostgreSQL and a connection string that is not one
        await using var api = PostgreSql("Host=mondino.example.test;Passwrd=correct-horse-battery", null);

        // When the backend starts
        var refusal = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        // Then it stops, names the setting, and shows nothing of its value
        Assert.Contains("ConnectionStrings:Mondino", refusal.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("correct-horse-battery", refusal.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PostgreSQL_without_a_connection_string_stops_the_backend_and_names_the_setting()
    {
        // Given PostgreSQL and no connection string
        await using var api = PostgreSql(null, null);

        // When the backend starts
        var refusal = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        // Then it stops and names the setting
        Assert.Contains("ConnectionStrings:Mondino", refusal.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task With_no_way_of_signing_in_given_the_connection_string_is_used_as_it_is()
    {
        // Given PostgreSQL and a connection string that carries its own password, as on a laptop
        await using var api = PostgreSql("Host=localhost;Database=mondino;Username=mondino;Password=local-only", null);
        using var client = api.CreateClient();

        // When the backend starts and its liveness is asked
        using var response = await client.GetAsync("/health/live");

        // Then it is running
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
