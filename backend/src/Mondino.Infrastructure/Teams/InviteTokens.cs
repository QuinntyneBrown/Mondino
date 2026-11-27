using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using Mondino.Application.Teams;

namespace Mondino.Infrastructure.Teams;

/// <summary>16 random bytes (128 bits), base64url without padding: 22 characters (docs/adr/0009).</summary>
internal sealed class InviteTokens : IInviteTokens
{
    public string Create() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16));
}
