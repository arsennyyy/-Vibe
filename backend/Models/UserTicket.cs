using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models
{
    public class UserTicket
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int EventId { get; set; }

        [Required]
        public int SeatId { get; set; }

        [Required]
        public string TicketType { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime EventDate { get; set; }

        [Required]
        public string QrCode { get; set; } = string.Empty;

        /// <summary>Старт 10-мин окон QR для этого билета (с момента покупки).</summary>
        public DateTime? QrRotationStartedAt { get; set; }

        public bool IsUsed { get; set; } = false;

        public bool IsRefunded { get; set; } = false;

        public DateTime? RefundedAt { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("EventId")]
        public virtual Event? Event { get; set; }

        [ForeignKey("SeatId")]
        public virtual Seat? Seat { get; set; }
    }
} 