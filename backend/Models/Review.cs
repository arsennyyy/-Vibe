using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    /// <summary>
    /// Таблица отзывов - позволяет пользователям оставлять отзывы о событиях
    /// Помогает другим пользователям принимать решения и улучшает качество сервиса
    /// </summary>
    public class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int EventId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; } // Оценка от 1 до 5

        public string? Comment { get; set; } // Текстовый отзыв

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public bool IsApproved { get; set; } = false; // Модерация отзывов

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("EventId")]
        public virtual Event? Event { get; set; }
    }
}

