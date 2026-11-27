using System.IO.Compression;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Net.Http.Headers;

namespace Mondino.Api.Hosting;

/// <summary>
/// How the Angular build in wwwroot is sent (docs/adr/0030): compressed, and a file named by its
/// content's hash kept by the browser for a year, so a repeat visit fetches only what changed
/// (L2-046). Everything else, index.html among it, is asked for again each time.
/// </summary>
internal static partial class AppFiles
{
    /// <summary>What the browser may keep a content-hashed file for: a year, never asking again.</summary>
    public const string Immutable = "public, max-age=31536000, immutable";

    /// <summary>A name the build gave from the file's content: a dash and eight characters before the extension.</summary>
    [GeneratedRegex(@"^[a-z0-9-]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$")]
    private static partial Regex ContentHashed();

    /// <summary>Brotli or gzip, over HTTPS too, for text, the page and the globe's model.</summary>
    public static IServiceCollection AddAppCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            // No answer puts a secret beside text a stranger chooses and can have asked for again
            // and again, which is what BREACH needs (docs/adr/0030).
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes
                .Concat(["text/javascript", "image/svg+xml", "model/gltf-binary", "application/problem+json"])
                .Distinct();
        });
        services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Optimal);
        services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Optimal);
        return services;
    }

    /// <summary>The build's files, typed and cached by their names.</summary>
    public static StaticFileOptions StaticFiles()
    {
        // The globe's model is glTF binary, which ASP.NET Core does not know by its extension (ADR 0012).
        var contentTypes = new FileExtensionContentTypeProvider();
        contentTypes.Mappings[".glb"] = "model/gltf-binary";
        return new StaticFileOptions
        {
            ContentTypeProvider = contentTypes,
            OnPrepareResponse = context => context.Context.Response.Headers[HeaderNames.CacheControl] =
                ContentHashed().IsMatch(context.File.Name) ? Immutable : "no-cache",
        };
    }
}
