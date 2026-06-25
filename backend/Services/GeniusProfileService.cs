using System.Text.RegularExpressions;

namespace MyMvcBackend.Services;

public class GeniusProfileService
{
    private readonly IHttpClientFactory _http;

    private static readonly HashSet<string> ReservedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "artists", "albums", "songs", "articles", "search", "login", "signup", "settings",
        "about", "jobs", "shop", "videos", "mixtapes", "users", "a", "embed", "api",
        "static", "discussions", "topics", "annotations", "press", "terms", "privacy",
        "dmca", "contributor_guidelines", "pro", "verified-artists", "new", "hot",
    };

    public GeniusProfileService(IHttpClientFactory http) => _http = http;

    public static bool IsGeniusProfileUrl(string? url) => TryParseProfileUri(url, out _);

    public static bool IsGeniusArtistUrl(string? url) => IsGeniusProfileUrl(url);

    public static string? NormalizeProfileUrl(string? url)
    {
        if (!TryParseProfileUri(url, out var uri) || uri == null) return null;
        return $"https://genius.com{uri.AbsolutePath.TrimEnd('/')}";
    }

    public static string? NormalizeArtistUrl(string? url) => NormalizeProfileUrl(url);

    public async Task<(string? Name, string? AvatarUrl)> FetchProfileAsync(string url, CancellationToken ct = default)
    {
        var normalized = NormalizeProfileUrl(url);
        if (normalized == null)
            throw new ArgumentException("Некорректная ссылка Genius (профиль артиста или пользователя)");

        var client = _http.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, normalized);
        request.Headers.TryAddWithoutValidation(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        request.Headers.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml");

        using var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync(ct);

        var avatarUrl = ResolveAvatarUrl(html);
        var name = Meta(html, "og:title") ?? Meta(html, "twitter:title");
        if (!string.IsNullOrWhiteSpace(name))
        {
            name = Regex.Replace(name, @"\s*Lyrics,\s*Songs.*$", "", RegexOptions.IgnoreCase).Trim();
            name = Regex.Replace(name, @"\s*\|\s*Genius.*$", "", RegexOptions.IgnoreCase).Trim();
            // «OVERLXRD (illicitmiracle)» → OVERLXRD
            var paren = Regex.Match(name, @"^(.+?)\s*\([^)]+\)\s*$");
            if (paren.Success) name = paren.Groups[1].Value.Trim();
        }

        return (name, avatarUrl);
    }

    private static string? ResolveAvatarUrl(string html)
    {
        // У пользователей og:image часто = sharing_fallback, реальный аватар в twitter:image / preload
        var candidates = new[]
        {
            Meta(html, "twitter:image"),
            Meta(html, "og:image"),
            ExtractProfileHeaderAvatar(html),
            ExtractPreloadAvatar(html),
        };

        foreach (var c in candidates)
        {
            if (IsValidAvatarUrl(c)) return c;
        }

        return null;
    }

    private static bool IsValidAvatarUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        var u = url.Trim().ToLowerInvariant();
        if (u.Contains("sharing_fallback")) return false;
        if (u.Contains("default_cover_image")) return false;
        if (u.Contains("assets.genius.com/images/")) return false;
        return u.Contains("images.genius.com");
    }

    private static string? ExtractProfileHeaderAvatar(string html)
    {
        var m = Regex.Match(
            html,
            @"profile_header-avatar[^>]+style=""[^""]*background-image:\s*url\('([^']+)'\)",
            RegexOptions.IgnoreCase);
        return m.Success ? Decode(m.Groups[1].Value.Trim()) : null;
    }

    private static string? ExtractPreloadAvatar(string html)
    {
        foreach (var size in new[] { "large", "medium", "small" })
        {
            var m = Regex.Match(
                html,
                $@"""avatar"":\{{[^}}]*""{size}"":\{{""url"":""([^""]+)""",
                RegexOptions.IgnoreCase);
            if (!m.Success) continue;
            var url = Decode(m.Groups[1].Value.Trim());
            if (IsValidAvatarUrl(url)) return url;
        }

        var artist = Regex.Match(html, @"""image_url"":""([^""]+)""", RegexOptions.IgnoreCase);
        if (artist.Success)
        {
            var url = Decode(artist.Groups[1].Value.Trim());
            if (IsValidAvatarUrl(url)) return url;
        }

        return null;
    }

    private static bool TryParseProfileUri(string? url, out Uri? uri)
    {
        uri = null;
        if (string.IsNullOrWhiteSpace(url)) return false;
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var parsed)) return false;

        var host = parsed.Host.ToLowerInvariant();
        if (host != "genius.com" && host != "www.genius.com") return false;

        var segments = parsed.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0) return false;

        if (segments[0].Equals("artists", StringComparison.OrdinalIgnoreCase))
        {
            if (segments.Length >= 2 && !string.IsNullOrWhiteSpace(segments[1]))
            {
                uri = parsed;
                return true;
            }
            return false;
        }

        if (segments.Length == 1 && !ReservedPaths.Contains(segments[0]))
        {
            uri = parsed;
            return true;
        }

        return false;
    }

    private static string? Meta(string source, string property)
    {
        var m = Regex.Match(
            source,
            $@"property=[""']{property}[""'][^>]+content=[""']([^""']+)[""']",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (m.Success) return Decode(m.Groups[1].Value.Trim());
        m = Regex.Match(
            source,
            $@"content=[""']([^""']+)[""'][^>]+property=[""']{property}[""']",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return m.Success ? Decode(m.Groups[1].Value.Trim()) : null;
    }

    private static string Decode(string value) =>
        System.Net.WebUtility.HtmlDecode(value);
}
