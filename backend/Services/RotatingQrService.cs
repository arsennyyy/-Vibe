using System.Security.Cryptography;
using System.Text;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

/// <summary>Динамический QR: окно 10 минут от покупки билета (не от сессии входа).</summary>
public static class RotatingQrService
{
    public const int WindowMinutes = 10;

    public static DateTime RotationStart(UserTicket ticket, DateTime utcNow)
    {
        if (ticket.QrRotationStartedAt.HasValue) return ticket.QrRotationStartedAt.Value;
        if (ticket.PurchaseDate != default) return ticket.PurchaseDate;
        return utcNow;
    }

    public static DateTime SessionStart(User user, DateTime utcNow) =>
        user.QrSessionStartedAt ?? utcNow;

    public static int GetWindowIndex(DateTime sessionStart, DateTime utcNow) =>
        Math.Max(0, (int)((utcNow - sessionStart).TotalMinutes / WindowMinutes));

    public static int SecondsUntilNextWindow(DateTime sessionStart, DateTime utcNow)
    {
        var elapsedSec = (utcNow - sessionStart).TotalSeconds;
        var windowSec = WindowMinutes * 60;
        var nextBoundary = (Math.Floor(elapsedSec / windowSec) + 1) * windowSec;
        return Math.Max(1, (int)(nextBoundary - elapsedSec));
    }

    public static string BuildQrValue(UserTicket ticket, User user, string siteBaseUrl, string secret, DateTime utcNow)
    {
        var sessionStart = RotationStart(ticket, utcNow);
        var window = GetWindowIndex(sessionStart, utcNow);
        var payload = $"T{ticket.Id}|E{ticket.EventId}|W{window}|U{user.Id}";
        var sig = Sign(payload, secret);
        var baseUrl = siteBaseUrl.TrimEnd('/');
        return $"{baseUrl}/verify?p={Uri.EscapeDataString(payload)}&s={sig}";
    }

    public static bool TryValidate(string payload, string sig, string secret, DateTime utcNow, User user, UserTicket ticket)
    {
        var r = Validate(payload, sig, secret, utcNow, user, ticket);
        return r.SignatureValid && r.WindowValid;
    }

    public static QrValidationResult Validate(
        string payload,
        string sig,
        string secret,
        DateTime utcNow,
        User user,
        UserTicket ticket)
    {
        var sessionStart = RotationStart(ticket, utcNow);
        var current = GetWindowIndex(sessionStart, utcNow);
        var secondsLeft = SecondsUntilNextWindow(sessionStart, utcNow);
        var windowSec = WindowMinutes * 60;
        var elapsedInWindow = windowSec - secondsLeft;
        var progress = (int)Math.Clamp(elapsedInWindow * 100.0 / windowSec, 0, 100);

        if (string.IsNullOrWhiteSpace(payload) || string.IsNullOrWhiteSpace(sig))
            return new QrValidationResult(false, false, -1, current, secondsLeft, progress);

        if (!ConstantTimeEquals(Sign(payload, secret), sig))
            return new QrValidationResult(false, false, -1, current, secondsLeft, progress);

        var parts = payload.Split('|');
        if (parts.Length != 4) return new QrValidationResult(true, false, -1, current, secondsLeft, progress);
        if (!parts[0].StartsWith('T') || !int.TryParse(parts[0][1..], out var tid) || tid != ticket.Id)
            return new QrValidationResult(true, false, -1, current, secondsLeft, progress);
        if (!parts[1].StartsWith('E') || !int.TryParse(parts[1][1..], out var eid) || eid != ticket.EventId)
            return new QrValidationResult(true, false, -1, current, secondsLeft, progress);
        if (!parts[2].StartsWith('W') || !int.TryParse(parts[2][1..], out var window))
            return new QrValidationResult(true, false, -1, current, secondsLeft, progress);
        if (!parts[3].StartsWith('U') || !int.TryParse(parts[3][1..], out var uid) || uid != user.Id)
            return new QrValidationResult(true, false, -1, current, secondsLeft, progress);

        var windowOk = window == current || window == current - 1;
        return new QrValidationResult(true, windowOk, window, current, secondsLeft, progress);
    }

    public record QrValidationResult(
        bool SignatureValid,
        bool WindowValid,
        int ScannedWindow,
        int CurrentWindow,
        int SecondsUntilNextWindow,
        int WindowProgressPercent);

    private static string Sign(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash)[..12].ToLowerInvariant();
    }

    private static bool ConstantTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var diff = 0;
        for (var i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
        return diff == 0;
    }
}
