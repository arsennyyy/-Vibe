using System;
using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public required string Name { get; set; }
        
        [Required]
        [StringLength(100)]
        [EmailAddress]
        public required string Email { get; set; }
        
        [Required]
        [StringLength(100)]
        public required string PasswordHash { get; set; }
        
        public bool EmailVerified { get; set; } = false;
        
        public bool IsAdmin { get; set; } = false;
        
        public bool IsOrganizer { get; set; } = false;
        
        public string? VerificationToken { get; set; }
        
        public DateTime? TokenExpiresAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? AvatarUrl { get; set; }

        /// <summary>Google OAuth subject (sub claim).</summary>
        [StringLength(64)]
        public string? GoogleSubjectId { get; set; }

        /// <summary>Старт 10-минутных окон для динамических QR-кодов.</summary>
        public DateTime? QrSessionStartedAt { get; set; }

        public bool NotifyOrderEmail { get; set; } = true;

        /// <summary>Только для организаторов: модерация и публикация.</summary>
        public bool NotifyOrganizerEvents { get; set; } = true;

        public bool NotifySite { get; set; } = true;

        /// <summary>Когда отправлено PDF-руководство организатора.</summary>
        public DateTime? OrganizerGuideSentAt { get; set; }

        /// <summary>Когда отправлено PDF-руководство администратора.</summary>
        public DateTime? AdminGuideSentAt { get; set; }
    }
}