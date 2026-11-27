using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Mondino.Application.Teams;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Teams;

/// <summary>
/// HMAC-SHA256 of the address under the key <c>EmailProtection:Key</c> (base64, at least 32
/// bytes), hex encoded (docs/adr/0009). Without the key it throws, so no team is made with an
/// email that could not be recognised later.
/// </summary>
internal sealed class HmacEmailFingerprints(IConfiguration configuration) : IEmailFingerprints
{
    public const string KeySetting = "EmailProtection:Key";

    public string FingerprintOf(EmailAddress email)
    {
        ArgumentNullException.ThrowIfNull(email);
        var key = Key();
        return Convert.ToHexStringLower(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(email.Value)));
    }

    private byte[] Key()
    {
        var text = configuration[KeySetting];
        byte[]? key = null;
        if (!string.IsNullOrWhiteSpace(text))
        {
            try
            {
                key = Convert.FromBase64String(text);
            }
            catch (FormatException)
            {
                key = null;
            }
        }

        return key is { Length: >= 32 }
            ? key
            : throw new InvalidOperationException($"{KeySetting} must be set to at least 32 bytes, base64 encoded.");
    }
}
