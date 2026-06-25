using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class TicketRefundRequest
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserTicketId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int EventId { get; set; }

    public string? Reason { get; set; }

    /// <summary>pending | approved | rejected</summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedByAdminId { get; set; }
    public string? ReviewComment { get; set; }

    [ForeignKey(nameof(UserTicketId))]
    public virtual UserTicket? UserTicket { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }

    [ForeignKey(nameof(EventId))]
    public virtual Event? Event { get; set; }
}
