using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models;

public class FaqCategory
{
    [Key]
    [MaxLength(32)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
