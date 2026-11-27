// Acceptance Test
// Traces to: L2-008
// Description: The globe's model is served from the app's own origin as glTF, never as the app shell

using System.Net;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class AppAssetsTests
{
    [Fact]
    public async Task The_globe_model_is_served_as_gltf_to_anyone()
    {
        // Given the API serving the app, and a browser with no session
        await using var api = new MondinoApi { ServesApp = true };
        using var client = api.CreateSecureClient();

        // When the globe's model is asked for by its hashed name
        using var response = await client.GetAsync("/media/globe-TEST.glb");

        // Then it is the model itself, typed as glTF binary
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("model/gltf-binary", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal("glTF"u8.ToArray(), body[..4]);
    }
}
