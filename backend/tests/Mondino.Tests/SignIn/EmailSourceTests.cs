// Acceptance Test
// Traces to: L2-052, L2-050, L2-051
// Description: A sign-in mail goes to Postmark after the answer, with the address and the link and nothing else, untracked, within 5 seconds, and never changes the answer

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.SignIn;
using Mondino.Domain.Teams;
using Mondino.Infrastructure.SignIn;
using Mondino.Tests.Support;

namespace Mondino.Tests.SignIn;

public sealed class EmailSourceTests
{
    [Fact]
    public async Task Postmark_is_given_the_address_and_the_link_and_nothing_else()
    {
        // Given Liam O’Connor, who made Harbour Lights from M5V 2T6 in Toronto with liam@southwind.co
        await using var api = new MondinoApi { UsesEmailSource = true };
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Harbour Lights");

        // When a sign-in link is asked for his email
        using var response = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "liam@southwind.co" });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        // Then Postmark is sent one message, with the server token, on the transactional stream
        var sent = await api.EmailSource.NextAsync();
        Assert.Equal("https://api.postmarkapp.com/email", sent.Address.ToString());
        Assert.Equal("postmark-test-token", sent.Headers["X-Postmark-Server-Token"]);
        using var message = JsonDocument.Parse(sent.Body);
        var root = message.RootElement;
        Assert.Equal("liam@southwind.co", root.GetProperty("To").GetString());
        Assert.Equal("Mondino <signin@mondino.test>", root.GetProperty("From").GetString());
        Assert.Equal("Your Mondino sign-in link", root.GetProperty("Subject").GetString());
        Assert.Equal("outbound", root.GetProperty("MessageStream").GetString());

        // And it is not tracked, so Postmark never rewrites the link through its own domain
        Assert.False(root.GetProperty("TrackOpens").GetBoolean());
        Assert.Equal("None", root.GetProperty("TrackLinks").GetString());

        // And its text holds the link and that it works once, for 15 minutes
        var text = root.GetProperty("TextBody").GetString()!;
        Assert.Matches(@"https://mondino\.test/sign-in#[A-Za-z0-9_-]{43}", text);
        Assert.Contains("It works once, for the next 15 minutes.", text, StringComparison.Ordinal);

        // And nothing else: beside the address, no name, team, city or postal code
        var besideTheAddress = text + root.GetProperty("Subject").GetString() + root.GetProperty("From").GetString();
        foreach (var secret in new[] { "Liam", "Connor", "Harbour", "Lights", "Toronto", "M5V", "2T6", "southwind" })
        {
            Assert.DoesNotContain(secret, besideTheAddress, StringComparison.OrdinalIgnoreCase);
        }

        Assert.Equal(
            ["From", "MessageStream", "Subject", "TextBody", "To", "TrackLinks", "TrackOpens"],
            root.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task A_call_Postmark_does_not_answer_is_given_up_after_5_seconds()
    {
        // Given Postmark, which does not answer
        await using var api = new MondinoApi { UsesEmailSource = true };
        api.EmailSource.Behaviour = SourceBehaviour.Hangs;
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client);

        // When a sign-in link is asked for a teammate's email
        using var response = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "liam@southwind.co" });

        // Then the answer does not wait for Postmark
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        // And the call is given up once 5 seconds have passed
        await api.EmailSource.NextAsync();
        api.Time.Advance(PostmarkSignInEmailSender.Timeout);
        await api.EmailSource.CancelledAsync();
    }

    [Fact]
    public async Task A_message_Postmark_refuses_is_not_accepted()
    {
        await using var api = new MondinoApi { UsesEmailSource = true };
        api.EmailSource.Behaviour = SourceBehaviour.Fails;

        var accepted = await SendAsync(api);

        Assert.False(accepted);
        Assert.Equal(1, api.EmailSource.Calls);
    }

    [Fact]
    public async Task After_5_failures_in_a_row_Postmark_is_not_called_for_30_seconds()
    {
        // Given Postmark, which has refused 5 messages in a row
        await using var api = new MondinoApi { UsesEmailSource = true };
        api.EmailSource.Behaviour = SourceBehaviour.Fails;
        for (var i = 0; i < 5; i++)
        {
            Assert.False(await SendAsync(api));
        }

        // When another is sent, even once Postmark is back
        api.EmailSource.Behaviour = SourceBehaviour.Answers;
        var whileOpen = await SendAsync(api);

        // Then it is not accepted and Postmark is not called, until 30 seconds have passed
        Assert.False(whileOpen);
        Assert.Equal(5, api.EmailSource.Calls);
        api.Time.Advance(TimeSpan.FromSeconds(30));
        Assert.True(await SendAsync(api));
        Assert.Equal(6, api.EmailSource.Calls);
    }

    [Fact]
    public async Task Without_a_server_token_nothing_is_sent()
    {
        await using var api = new MondinoApi { UsesEmailSource = true, EmailServerToken = null };

        var accepted = await SendAsync(api);

        Assert.False(accepted);
        Assert.Equal(0, api.EmailSource.Calls);
    }

    private static async Task<bool> SendAsync(MondinoApi api)
    {
        Assert.True(EmailAddress.TryParse("liam@southwind.co", out var email));
        var sender = api.Services.GetRequiredService<ISignInEmailSender>();
        return await sender.SendAsync(new SignInMail(email!, new Uri("https://mondino.test/sign-in#token")), CancellationToken.None);
    }
}
