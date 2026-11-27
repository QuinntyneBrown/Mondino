using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>
/// The keyed fingerprint of a work email, by which a teammate is recognised without the address
/// being kept (docs/adr/0009). One address gives one fingerprint, under one key.
/// </summary>
public interface IEmailFingerprints
{
    string FingerprintOf(EmailAddress email);
}
