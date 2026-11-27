// Acceptance Test
// Traces to: L2-043, L2-052
// Description: A sign-in link's token has at least 128 bits of randomness, and the backend keeps only its hash and the email sealed by it, never the token or the address

using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;
using Mondino.Tests.Support;

namespace Mondino.Tests.SignIn;

public sealed class SignInTokenTests
{
    [Fact]
    public async Task The_token_has_at_least_128_bits_and_the_backend_keeps_neither_it_nor_the_address()
    {
        // Given Sofia's Northwind
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When two sign-in links are asked for her email
        (await client.PostAsJsonAsync("/api/sign-in-links", new { email = "sofia@northwind.co" })).Dispose();
        var first = api.SignInMails.TokenSentTo("sofia@northwind.co");
        (await client.PostAsJsonAsync("/api/sign-in-links", new { email = "sofia@northwind.co" })).Dispose();
        var second = api.SignInMails.TokenSentTo("sofia@northwind.co");

        // Then each token carries at least 128 random bits, and the two differ
        Assert.True(WebEncoders.Base64UrlDecode(first).Length * 8 >= 128);
        Assert.NotEqual(first, second);

        // And what is stored holds neither token nor the address, in any column
        await using var scope = api.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var links = await database.SignInLinks.AsNoTracking().ToListAsync();
        Assert.Equal(2, links.Count);
        foreach (var link in links)
        {
            var stored = string.Join(
                '\n',
                link.TokenHash,
                link.EmailFingerprint,
                Encoding.UTF8.GetString(link.SealedEmail),
                Convert.ToBase64String(link.SealedEmail));
            foreach (var secret in new[] { first, second, "sofia@northwind.co", "sofia" })
            {
                Assert.DoesNotContain(secret, stored, StringComparison.OrdinalIgnoreCase);
            }

            Assert.Equal(MondinoApi.Now + TimeSpan.FromMinutes(15), link.ExpiresAt);
            Assert.Null(link.UsedAt);
        }
    }
}
