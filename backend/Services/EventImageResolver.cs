using System.Text.Json;

namespace MyMvcBackend.Services
{
    public static class EventImageResolver
    {
        private const string DefaultImage =
            "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80";

        private static readonly Dictionary<string, string> Stock = new(StringComparer.OrdinalIgnoreCase)
        {
            ["markul"] = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
            ["pharaoh"] = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
            ["три дня дождя"] = "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
            ["лсп"] = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
            ["miyagi"] = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
            ["би-2"] = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
            ["kai angel"] = "https://images.unsplash.com/photo-1598387846159-ed4004000b01?auto=format&fit=crop&w=1200&q=80",
            ["noize mc"] = "https://images.unsplash.com/photo-1506157786151-581731abf49?auto=format&fit=crop&w=1200&q=80",
            ["overlxrd"] = "https://images.unsplash.com/photo-1571266028243-e68f8570c9e0?auto=format&fit=crop&w=1200&q=80",
            ["анамнез"] = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
            ["висхолдинг"] = "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
        };

        public static string? NormalizeStoragePath(string? image)
        {
            if (string.IsNullOrWhiteSpace(image)) return image;
            var u = image.Trim();
            var idx = u.IndexOf("/uploads/", StringComparison.OrdinalIgnoreCase);
            if (idx >= 0) return u[idx..];
            if (u.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
                return "/" + u;
            return u;
        }

        public static bool IsMissingImage(string? image)
        {
            if (string.IsNullOrWhiteSpace(image)) return true;
            var u = image.Trim();
            if (u is "?" or "??" or "???") return true;
            return u.StartsWith("/images/", StringComparison.OrdinalIgnoreCase)
                || u.StartsWith("images/", StringComparison.OrdinalIgnoreCase);
        }

        public static string Resolve(string? image, string title, string? lineupJson, string? genre = null)
        {
            image = NormalizeStoragePath(image);
            if (!IsMissingImage(image)) return image!.Trim();

            var haystack = title ?? "";
            if (!string.IsNullOrWhiteSpace(lineupJson))
            {
                try
                {
                    var arr = JsonSerializer.Deserialize<string[]>(lineupJson);
                    if (arr != null) haystack += " " + string.Join(' ', arr);
                }
                catch
                {
                    haystack += " " + lineupJson;
                }
            }
            if (!string.IsNullOrWhiteSpace(genre)) haystack += " " + genre;

            var lower = haystack.ToLowerInvariant();
            foreach (var kv in Stock)
            {
                if (lower.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                    return kv.Value;
            }

            return DefaultImage;
        }
    }
}
