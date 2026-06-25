using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class TicketTransfer
{
    [Key]
    public int Id { get; set; }

    public int UserTicketId { get; set; }

    public int SenderUserId { get; set; }

    public int RecipientUserId { get; set; }

    [Required]
    [MaxLength(120)]
    public string RecipientEmail { get; set; } = "";

    public decimal Price { get; set; }

    /// <summary>pending | declined | expired | completed | cancelled</summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RespondedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    [ForeignKey(nameof(UserTicketId))]
    public virtual UserTicket? UserTicket { get; set; }

    [ForeignKey(nameof(SenderUserId))]
    public virtual User? Sender { get; set; }

    [ForeignKey(nameof(RecipientUserId))]
    public virtual User? Recipient { get; set; }
}
