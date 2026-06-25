using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    /// <summary>
    /// Таблица заказов - группирует билеты пользователя в один заказ
    /// Позволяет отслеживать полную стоимость заказа, статус оплаты и дату создания
    /// </summary>
    public class Order
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public string OrderNumber { get; set; } = string.Empty; // Уникальный номер заказа

        [Required]
        public decimal TotalAmount { get; set; } // Общая сумма заказа

        [Required]
        public string Status { get; set; } = "pending"; // pending, paid, cancelled, refunded

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public int? EventId { get; set; }

        [StringLength(300)]
        public string? EventTitle { get; set; }

        [StringLength(100)]
        public string? SeatLabel { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}

