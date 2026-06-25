using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models;

/// <summary>OTP для регистрации и входа (2FA по email).</summary>
public class AuthOtpChallenge
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Email { get; set; } = "";

    /// <summary>register | login</summary>
    [Required]
    [MaxLength(20)]
    public string Purpose { get; set; } = "";

    [Required]
    [MaxLength(200)]
    public string CodeHash { get; set; } = "";

    /// <summary>JSON: имя и хеш пароля при регистрации.</summary>
    public string? PayloadJson { get; set; }

    public int? UserId { get; set; }

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSentAt { get; set; } = DateTime.UtcNow;

    public int ResendCountToday { get; set; }
    public DateOnly ResendDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}
