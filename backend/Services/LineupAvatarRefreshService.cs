using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

/// <summary>
/// Подтягивает аватарки артистов с Genius и сохраняет в JSON состава.</summary>
public class LineupAvatarRefreshService
{
    private static readonly TimeSpan SyncTtl = TimeSpan.FromHours(6);
    private readonly GeniusProfileService _genius;

    public LineupAvatarRefreshService(GeniusProfileService genius) => _genius = genius;

    public async Task<bool> TryRefreshEventAsync(ApplicationDbContext db, Event evt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(evt.Lineup)) return false;
        var updated = await RefreshLineupJsonAsync(evt.Lineup, ct);
        if (updated == null || updated == evt.Lineup) return false;
        evt.Lineup = updated;
        evt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<string?> RefreshLineupJsonAsync(string? lineupJson, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(lineupJson)) return lineupJson;

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(lineupJson);
        }
        catch
        {
            return lineupJson;
        }

        if (root is not JsonArray arr) return lineupJson;

        var changed = false;
        var now = DateTime.UtcNow;

        foreach (var node in arr)
        {
            if (node is not JsonObject obj) continue;

            var geniusUrl = ResolveGeniusUrl(obj);
            if (string.IsNullOrWhiteSpace(geniusUrl)) continue;

            var syncedRaw = obj["avatarSyncedAt"]?.GetValue<string>()
                ?? obj["AvatarSyncedAt"]?.GetValue<string>();
            if (DateTime.TryParse(syncedRaw, out var syncedAt) && now - syncedAt.ToUniversalTime() < SyncTtl)
                continue;

            try
            {
                var (name, avatarUrl) = await _genius.FetchProfileAsync(geniusUrl, ct);
                var prevAvatar = obj["avatarUrl"]?.GetValue<string>() ?? obj["AvatarUrl"]?.GetValue<string>();
                var prevName = obj["name"]?.GetValue<string>() ?? obj["Name"]?.GetValue<string>();

                if (!string.IsNullOrWhiteSpace(name) && name != prevName)
                {
                    obj["name"] = name;
                    changed = true;
                }

                if (!string.IsNullOrWhiteSpace(avatarUrl) && avatarUrl != prevAvatar)
                {
                    obj["avatarUrl"] = avatarUrl;
                    changed = true;
                }

                obj["geniusUrl"] = geniusUrl;
                obj.Remove("bandLink");
                obj["avatarSyncedAt"] = now.ToString("O");
                changed = true;
            }
            catch
            {
                // Не ломаем выдачу события из-за Genius
            }
        }

        return changed ? arr.ToJsonString() : lineupJson;
    }

    private static string? ResolveGeniusUrl(JsonObject obj)
    {
        var genius = obj["geniusUrl"]?.GetValue<string>() ?? obj["GeniusUrl"]?.GetValue<string>();
        if (GeniusProfileService.IsGeniusProfileUrl(genius))
            return GeniusProfileService.NormalizeProfileUrl(genius);

        var legacy = obj["bandLink"]?.GetValue<string>() ?? obj["BandLink"]?.GetValue<string>();
        if (GeniusProfileService.IsGeniusProfileUrl(legacy))
            return GeniusProfileService.NormalizeProfileUrl(legacy);

        return null;
    }
}
