using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    public class CookieConsent
    {
        [Key]
        public int Id { get; set; }

        /// <summary>Анонимный идентификатор из браузера (localStorage).</summary>
        [Required]
        [MaxLength(64)]
        public string VisitorId { get; set; } = string.Empty;

        public int? UserId { get; set; }

        public bool Essential { get; set; } = true;

        public bool Analytics { get; set; }

        public bool Marketing { get; set; }

        [MaxLength(512)]
        public string? UserAgent { get; set; }

        [MaxLength(64)]
        public string? IpHash { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }
    }
}
