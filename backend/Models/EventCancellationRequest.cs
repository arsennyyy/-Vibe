using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class EventCancellationRequest
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int EventId { get; set; }

    [Required]
    public int OrganizerId { get; set; }

    [Required]
    public string Reason { get; set; } = "";

    /// <summary>pending | approved | rejected</summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedByAdminId { get; set; }
    public string? ReviewComment { get; set; }

    [ForeignKey(nameof(EventId))]
    public virtual Event? Event { get; set; }

    [ForeignKey(nameof(OrganizerId))]
    public virtual User? Organizer { get; set; }
}
