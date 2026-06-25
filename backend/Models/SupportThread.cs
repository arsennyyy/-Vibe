using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class SupportThread
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    /// <summary>visitor | organizer</summary>
    [Required]
    [MaxLength(20)]
    public string UserRole { get; set; } = "visitor";

    /// <summary>ai | awaiting_admin | answered | closed</summary>
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "ai";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }

    public virtual ICollection<SupportMessage> Messages { get; set; } = new List<SupportMessage>();
}

public class SupportMessage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ThreadId { get; set; }

    /// <summary>user | ai | admin</summary>
    [Required]
    [MaxLength(20)]
    public string SenderRole { get; set; } = "user";

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ThreadId))]
    public virtual SupportThread? Thread { get; set; }
}
