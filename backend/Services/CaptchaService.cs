using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace MyMvcBackend.Services;

public class CaptchaService
{
    private const int TokenTtlMinutes = 10;
    private const int MinButtonDelayMs = 600;
    private const int MaxButtonDelayMs = 300_000;

    private readonly ConcurrentDictionary<string, CaptchaSession> _sessions = new();
    private readonly ConcurrentDictionary<string, DateTime> _tokens = new();

    public string CreateChallenge()
    {
        Cleanup();
        var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        _sessions[id] = new CaptchaSession { Id = id, CreatedAt = DateTime.UtcNow };
        return id;
    }

    /// <summary>Капча-кнопка: нажатие не раньше MinButtonDelayMs после выдачи challenge.</summary>
    public (bool Ok, string? Error, string? Token) VerifyButton(string challengeId)
    {
        Cleanup();
        if (!_sessions.TryRemove(challengeId, out var session))
            return (false, "Проверка устарела. Закройте окно и попробуйте снова.", null);

        var elapsedMs = (DateTime.UtcNow - session.CreatedAt).TotalMilliseconds;
        if (elapsedMs < MinButtonDelayMs)
            return (false, "Слишком быстро. Подождите секунду и нажмите снова.", null);

        if (elapsedMs > MaxButtonDelayMs)
            return (false, "Время проверки истекло.", null);

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        _tokens[token] = DateTime.UtcNow.AddMinutes(TokenTtlMinutes);
        return (true, null, token);
    }

    public bool ConsumeToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;
        Cleanup();
        if (!_tokens.TryRemove(token.Trim(), out var expires)) return false;
        return DateTime.UtcNow <= expires;
    }

    private void Cleanup()
    {
        var now = DateTime.UtcNow;
        foreach (var kv in _sessions.Where(kv => (now - kv.Value.CreatedAt).TotalMinutes > 6).ToList())
            _sessions.TryRemove(kv.Key, out _);
        foreach (var kv in _tokens.Where(kv => kv.Value < now).ToList())
            _tokens.TryRemove(kv.Key, out _);
    }

    private class CaptchaSession
    {
        public required string Id { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
