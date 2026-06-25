using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    /// <summary>
    /// Таблица платежей - хранит информацию о всех платежах
    /// Позволяет отслеживать способ оплаты, статус, транзакции и историю платежей
    /// </summary>
    public class Payment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [Required]
        public string PaymentMethod { get; set; } = string.Empty; // card, bank_transfer, e_wallet

        [Required]
        public string Status { get; set; } = "pending"; // pending, completed, failed, refunded

        public string? TransactionId { get; set; } // ID транзакции от платежной системы

        public string? PaymentDetails { get; set; } // Дополнительная информация (JSON)

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public int? EventId { get; set; }
        public int? OrganizerId { get; set; }
        public decimal? GrossAmount { get; set; }
        public decimal? PlatformFee { get; set; }
        public decimal? OrganizerPayout { get; set; }
        public decimal? CommissionPercent { get; set; }

        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}

