using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class EventRescheduleRequest
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int EventId { get; set; }

    [Required]
    public int OrganizerId { get; set; }

    public DateTime OriginalDate { get; set; }
    [Required]
    [MaxLength(10)]
    public string OriginalTime { get; set; } = "";

    public DateTime ProposedDate { get; set; }
    [Required]
    [MaxLength(10)]
    public string ProposedTime { get; set; } = "";

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
}
