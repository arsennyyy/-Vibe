using System;
using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    /// <summary>
    /// Таблица сообщений из формы обратной связи - сохраняет все обращения пользователей
    /// Позволяет отслеживать обращения, отвечать на них и анализировать популярные вопросы
    /// </summary>
    public class ContactMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = "new"; // new, in_progress, resolved, archived

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ResolvedAt { get; set; }

        public string? Response { get; set; } // Ответ администратора

        public int? RespondedByUserId { get; set; } // ID администратора, который ответил
    }
}

