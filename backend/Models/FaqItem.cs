using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyMvcBackend.Models;

public class FaqItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(32)]
    public string CategoryId { get; set; } = string.Empty;

    [Required]
    public string Question { get; set; } = string.Empty;

    [Required]
    public string Answer { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    [ForeignKey(nameof(CategoryId))]
    public FaqCategory? Category { get; set; }
}
