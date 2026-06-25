using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    /// <summary>
    /// Таблица уведомлений - хранит все уведомления для пользователей
    /// Позволяет отправлять уведомления о новых событиях, изменениях в билетах, напоминаниях
    /// </summary>
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = "info"; // info, warning, success, error, reminder

        [Required]
        public bool IsRead { get; set; } = false;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        public int? RelatedEventId { get; set; } // Связь с событием, если уведомление связано с ним

        public int? RelatedTicketId { get; set; } // Связь с билетом, если уведомление связано с ним

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("RelatedEventId")]
        public virtual Event? RelatedEvent { get; set; }

        [ForeignKey("RelatedTicketId")]
        public virtual UserTicket? RelatedTicket { get; set; }
    }
}

