using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public class OtpService
{
    private const int CodeLength = 6;
    private const int TtlSeconds = 120;
    private const int MaxResendsPerDay = 5;
    private static readonly char[] CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly ApplicationDbContext _db;
    private readonly IEmailService _email;

    public OtpService(ApplicationDbContext db, IEmailService email)
    {
        _db = db;
        _email = email;
    }

    public static string GenerateCode()
    {
        var bytes = RandomNumberGenerator.GetBytes(CodeLength);
        var sb = new StringBuilder(CodeLength);
        for (var i = 0; i < CodeLength; i++)
            sb.Append(CodeAlphabet[bytes[i] % CodeAlphabet.Length]);
        return sb.ToString();
    }

    public async Task<(bool Ok, string? Error, int? ChallengeId, int ExpiresInSec)> StartRegisterAsync(
        string email, string name, string passwordHash)
    {
        var normalized = email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == normalized))
            return (false, "Пользователь с таким email уже существует", null, 0);

        await InvalidatePendingAsync(normalized, "register");

        var (emailOk, emailError) = await EmailAddressValidator.ValidateForOutboundAsync(normalized);
        if (!emailOk) return (false, emailError, null, 0);

        var code = GenerateCode();
        var challenge = new AuthOtpChallenge
        {
            Email = normalized,
            Purpose = "register",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            PayloadJson = JsonSerializer.Serialize(
                new RegisterPayload { Name = name.Trim(), PasswordHash = passwordHash },
                JsonOpts),
            ExpiresAt = DateTime.UtcNow.AddSeconds(TtlSeconds),
            CreatedAt = DateTime.UtcNow,
            LastSentAt = DateTime.UtcNow,
            ResendCountToday = 0,
            ResendDate = DateOnly.FromDateTime(DateTime.UtcNow),
        };
        _db.AuthOtpChallenges.Add(challenge);
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(normalized, code, "регистрации");
        return (true, null, challenge.Id, TtlSeconds);
    }

    public async Task<(bool Ok, string? Error, int? ChallengeId, int ExpiresInSec)> StartLoginAsync(User user)
    {
        var normalized = user.Email.Trim().ToLowerInvariant();

        var (emailOk, emailError) = await EmailAddressValidator.ValidateForOutboundAsync(normalized);
        if (!emailOk) return (false, emailError, null, 0);

        await InvalidatePendingAsync(normalized, "login");

        var code = GenerateCode();
        var challenge = new AuthOtpChallenge
        {
            Email = normalized,
            Purpose = "login",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddSeconds(TtlSeconds),
            CreatedAt = DateTime.UtcNow,
            LastSentAt = DateTime.UtcNow,
            ResendCountToday = 0,
            ResendDate = DateOnly.FromDateTime(DateTime.UtcNow),
        };
        _db.AuthOtpChallenges.Add(challenge);
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(normalized, code, "входа");
        return (true, null, challenge.Id, TtlSeconds);
    }

    public async Task<(bool Ok, string? Error, int ExpiresInSec)> ResendAsync(int challengeId)
    {
        var challenge = await _db.AuthOtpChallenges.FindAsync(challengeId);
        if (challenge == null) return (false, "Запрос не найден", 0);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (challenge.ResendDate != today)
        {
            challenge.ResendDate = today;
            challenge.ResendCountToday = 0;
        }

        if (challenge.ResendCountToday >= MaxResendsPerDay)
            return (false, "Превышен лимит: не более 5 повторных отправок в сутки", 0);

        var elapsed = (DateTime.UtcNow - challenge.LastSentAt).TotalSeconds;
        if (elapsed < TtlSeconds)
            return (false, $"Повторная отправка доступна через {Math.Ceiling(TtlSeconds - elapsed)} сек.", 0);

        var code = GenerateCode();
        challenge.CodeHash = BCrypt.Net.BCrypt.HashPassword(code);
        challenge.ExpiresAt = DateTime.UtcNow.AddSeconds(TtlSeconds);
        challenge.LastSentAt = DateTime.UtcNow;
        challenge.ResendCountToday++;
        await _db.SaveChangesAsync();

        var purposeLabel = challenge.Purpose switch
        {
            "register" => "регистрации",
            "event_cancel" => "отмены концерта",
            _ => "входа",
        };
        await _email.SendOtpEmailAsync(challenge.Email, code, purposeLabel);
        return (true, null, TtlSeconds);
    }

    public class RegisterPayload
    {
        public string Name { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public string? Email { get; set; }
    }

    public async Task<(bool Ok, string? Error, User? User, RegisterPayload? Register)> VerifyAsync(int challengeId, string code)
    {
        var challenge = await _db.AuthOtpChallenges.FindAsync(challengeId);
        if (challenge == null) return (false, "Код устарел или запрос не найден", null, null);

        if (DateTime.UtcNow > challenge.ExpiresAt)
        {
            _db.AuthOtpChallenges.Remove(challenge);
            await _db.SaveChangesAsync();
            return (false, "Срок действия кода истёк (2 минуты). Запросите новый.", null, null);
        }

        var normalized = code.Trim().ToUpperInvariant();
        if (normalized.Length != CodeLength || !BCrypt.Net.BCrypt.Verify(normalized, challenge.CodeHash))
            return (false, "Неверный код подтверждения", null, null);

        if (challenge.Purpose == "login")
        {
            var user = challenge.UserId.HasValue
                ? await _db.Users.FindAsync(challenge.UserId.Value)
                : await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == challenge.Email);
            _db.AuthOtpChallenges.Remove(challenge);
            await _db.SaveChangesAsync();
            return user == null
                ? (false, "Пользователь не найден", null, null)
                : (true, null, user, null);
        }

        if (challenge.Purpose == "register")
        {
            RegisterPayload? payload = null;
            if (!string.IsNullOrEmpty(challenge.PayloadJson))
                payload = JsonSerializer.Deserialize<RegisterPayload>(challenge.PayloadJson, JsonOpts);

            if (payload == null || string.IsNullOrWhiteSpace(payload.Name) || string.IsNullOrWhiteSpace(payload.PasswordHash))
                return (false, "Данные регистрации утеряны. Начните заново.", null, null);

            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == challenge.Email))
                return (false, "Email уже зарегистрирован", null, null);

            _db.AuthOtpChallenges.Remove(challenge);
            await _db.SaveChangesAsync();
            payload.Email = challenge.Email;
            return (true, null, null, payload);
        }

        return (false, "Неизвестный тип запроса", null, null);
    }

    public static string GenerateNumericCode()
    {
        var n = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return n.ToString("D6");
    }

    public class EventCancelPayload
    {
        public int EventId { get; set; }
        public int OrganizerId { get; set; }
        public string Reason { get; set; } = "";
    }

    public async Task<(bool Ok, string? Error, int? ChallengeId, int ExpiresInSec)> StartEventCancelAsync(
        User organizer, int eventId, string reason)
    {
        var normalized = organizer.Email.Trim().ToLowerInvariant();
        await InvalidatePendingAsync(normalized, "event_cancel");

        var code = GenerateNumericCode();
        var challenge = new AuthOtpChallenge
        {
            Email = normalized,
            Purpose = "event_cancel",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            UserId = organizer.Id,
            PayloadJson = JsonSerializer.Serialize(new EventCancelPayload
            {
                EventId = eventId,
                OrganizerId = organizer.Id,
                Reason = reason.Trim(),
            }, JsonOpts),
            ExpiresAt = DateTime.UtcNow.AddSeconds(TtlSeconds),
            CreatedAt = DateTime.UtcNow,
            LastSentAt = DateTime.UtcNow,
        };
        _db.AuthOtpChallenges.Add(challenge);
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(normalized, code, "отмены концерта");
        return (true, null, challenge.Id, TtlSeconds);
    }

    public async Task<(bool Ok, string? Error, EventCancelPayload? Payload)> VerifyEventCancelAsync(int challengeId, string code)
    {
        var challenge = await _db.AuthOtpChallenges.FindAsync(challengeId);
        if (challenge == null || challenge.Purpose != "event_cancel")
            return (false, "Запрос не найден", null);

        if (DateTime.UtcNow > challenge.ExpiresAt)
        {
            _db.AuthOtpChallenges.Remove(challenge);
            await _db.SaveChangesAsync();
            return (false, "Срок действия кода истёк. Запросите новый.", null);
        }

        var normalized = code.Trim();
        if (normalized.Length != CodeLength || !normalized.All(char.IsDigit)
            || !BCrypt.Net.BCrypt.Verify(normalized, challenge.CodeHash))
            return (false, "Неверный код подтверждения", null);

        EventCancelPayload? payload = null;
        if (!string.IsNullOrEmpty(challenge.PayloadJson))
            payload = JsonSerializer.Deserialize<EventCancelPayload>(challenge.PayloadJson, JsonOpts);

        if (payload == null || payload.EventId <= 0)
            return (false, "Данные запроса утеряны. Начните заново.", null);

        _db.AuthOtpChallenges.Remove(challenge);
        await _db.SaveChangesAsync();
        return (true, null, payload);
    }

    private async Task InvalidatePendingAsync(string email, string purpose)
    {
        var old = await _db.AuthOtpChallenges
            .Where(c => c.Email == email && c.Purpose == purpose)
            .ToListAsync();
        if (old.Count > 0)
        {
            _db.AuthOtpChallenges.RemoveRange(old);
            await _db.SaveChangesAsync();
        }
    }

}
